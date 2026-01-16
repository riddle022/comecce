import { createClient } from 'npm:@supabase/supabase-js@2';

const ALLOWED_ORIGINS = [
  'https://pxqyknaecuiujehzvzph.supabase.co',
  'https://*.webcontainer-api.io',
  'https://*.webcontainer.io',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://*.netlify.app',
];

const IS_PRODUCTION = Deno.env.get('DENO_ENV') === 'production';

const VALID_ACTIONS = ['view_menu', 'edit_data', 'delete_data'] as const;
const VALID_RESOURCES = [
  'comercial',
  'financeiro',
  'operacional',
  'upload',
  'usuarios',
  'grupos',
  'empresas',
  'dashboard'
] as const;

const RATE_LIMITS = {
  GET: { requests: 60, window: 60 },
  POST: { requests: 30, window: 60 },
  UNAUTHENTICATED: { requests: 10, window: 60 }
};

interface PermissionRequest {
  action: string;
  resource?: string;
}

interface Permissions {
  admin: boolean;
  edit_data: boolean;
  delete_data: boolean;
  menus: string[];
}

interface Empresa {
  id_empresa: string;
  cnpj: string;
  ds_empresa: string;
  telefone?: string | null;
  email?: string | null;
  grupoeco_id?: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface ApiResponse {
  hasPermission: boolean;
  isAdmin?: boolean;
  permissions?: Permissions;
  grupo?: {
    id: string;
    nome: string;
  };
  perfil?: {
    id: string;
    nome: string;
    email: string;
  };
  empresas?: Empresa[];
  empresasCount?: number;
  error?: string;
  userInactive?: boolean;
  action?: string;
  resource?: string;
  message?: string;
}

interface AuditLogParams {
  userId?: string;
  eventType: 'auth' | 'security' | 'data_change' | 'permission_change';
  action: string;
  resource?: string;
  granted: boolean;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

function getDefaultPermissions(): Permissions {
  return {
    admin: false,
    edit_data: false,
    delete_data: false,
    menus: []
  };
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  let allowedOrigin = '';

  if (origin) {
    const isAllowed = ALLOWED_ORIGINS.some(allowed => {
      if (allowed.includes('*')) {
        const pattern = allowed.replace('*', '.*');
        return new RegExp(`^${pattern}$`).test(origin);
      }
      return allowed === origin;
    });

    if (isAllowed) {
      allowedOrigin = origin;
    }
  }

  return {
    'Access-Control-Allow-Origin': allowedOrigin || ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
    'Access-Control-Allow-Credentials': 'true',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  };
}

function createJsonResponse(data: ApiResponse, status: number, origin: string | null): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        ...getCorsHeaders(origin),
        'Content-Type': 'application/json',
      },
    }
  );
}

function logInfo(message: string, ...args: any[]): void {
  if (!IS_PRODUCTION) {
    console.log(message, ...args);
  }
}

function logError(message: string, error?: any): void {
  if (IS_PRODUCTION) {
    console.error(message);
  } else {
    console.error(message, error);
  }
}

function getClientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
         req.headers.get('x-real-ip') ||
         'unknown';
}

function getUserAgent(req: Request): string {
  return req.headers.get('user-agent') || 'unknown';
}

function validatePermissionRequest(body: unknown): PermissionRequest | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const { action, resource } = body as any;

  if (!action || !VALID_ACTIONS.includes(action)) {
    return null;
  }

  if (resource && !VALID_RESOURCES.includes(resource)) {
    return null;
  }

  return { action, resource };
}

async function logAuditEvent(
  adminSupabase: any,
  params: AuditLogParams
): Promise<void> {
  try {
    const { error } = await adminSupabase
      .from('audit_logs')
      .insert({
        user_id: params.userId || null,
        event_type: params.eventType,
        action: params.action,
        resource: params.resource || null,
        granted: params.granted,
        ip_address: params.ipAddress || null,
        user_agent: params.userAgent || null,
        metadata: params.metadata || {}
      });

    if (error) {
      logError('Error logging audit event', error);
    }
  } catch (err) {
    logError('Exception in logAuditEvent', err);
  }
}

async function checkRateLimit(
  adminSupabase: any,
  identifier: string,
  identifierType: 'user' | 'ip',
  endpoint: string
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    await adminSupabase.rpc('cleanup_old_rate_limits');

    const limit = endpoint === 'GET'
      ? RATE_LIMITS.GET
      : endpoint === 'POST'
        ? RATE_LIMITS.POST
        : RATE_LIMITS.UNAUTHENTICATED;

    const windowStart = new Date(Date.now() - (limit.window * 1000));

    const { data: existingLimit } = await adminSupabase
      .from('rate_limits')
      .select('*')
      .eq('identifier', identifier)
      .eq('identifier_type', identifierType)
      .eq('endpoint', endpoint)
      .gte('window_start', windowStart.toISOString())
      .maybeSingle();

    if (existingLimit) {
      if (existingLimit.request_count >= limit.requests) {
        return {
          allowed: false,
          remaining: 0
        };
      }

      await adminSupabase
        .from('rate_limits')
        .update({
          request_count: existingLimit.request_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLimit.id);

      return {
        allowed: true,
        remaining: limit.requests - existingLimit.request_count - 1
      };
    } else {
      await adminSupabase
        .from('rate_limits')
        .insert({
          identifier,
          identifier_type: identifierType,
          endpoint,
          request_count: 1,
          window_start: new Date().toISOString()
        });

      return {
        allowed: true,
        remaining: limit.requests - 1
      };
    }
  } catch (err) {
    logError('Error in rate limit check', err);
    return { allowed: true, remaining: -1 };
  }
}

async function getUserEmpresas(supabase: any, userId: string, isAdmin: boolean): Promise<Empresa[]> {
  let empresas: Empresa[] = [];

  if (isAdmin) {
    logInfo('Admin user - fetching all active empresas');
    const { data, error } = await supabase
      .from('empresas')
      .select('*')
      .eq('ativo', true)
      .order('ds_empresa', { ascending: true });

    if (error) {
      logError('Error fetching empresas', error);
      throw error;
    }

    empresas = data || [];
    logInfo(`Found ${empresas.length} active empresas for admin`);
  } else {
    logInfo('Regular user - fetching associated empresas');

    const { data: usuariosEmpresas, error: ueError } = await supabase
      .from('usuarios_empresas')
      .select('empresa_id')
      .eq('usuario_id', userId);

    if (ueError) {
      logError('Error fetching usuarios_empresas', ueError);
      throw ueError;
    }

    const empresaIds = usuariosEmpresas?.map((ue: any) => ue.empresa_id) || [];
    logInfo(`User has ${empresaIds.length} associated empresas`);

    if (empresaIds.length > 0) {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .in('id_empresa', empresaIds)
        .eq('ativo', true)
        .order('ds_empresa', { ascending: true });

      if (error) {
        logError('Error fetching empresas', error);
        throw error;
      }

      empresas = data || [];
      logInfo(`Found ${empresas.length} active empresas for user`);
    } else {
      logInfo('User has no associated empresas');
    }
  }

  return empresas;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const clientIp = getClientIp(req);
  const userAgent = getUserAgent(req);

  logInfo('check-permissions called:', req.method, 'from', clientIp);

  if (req.method === 'OPTIONS') {
    logInfo('OPTIONS request handled');
    return new Response(null, {
      status: 200,
      headers: getCorsHeaders(origin),
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      const rateLimitCheck = await checkRateLimit(adminSupabase, clientIp, 'ip', req.method);

      if (!rateLimitCheck.allowed) {
        await logAuditEvent(adminSupabase, {
          eventType: 'security',
          action: 'rate_limit_exceeded',
          granted: false,
          ipAddress: clientIp,
          userAgent,
          metadata: { endpoint: req.method }
        });

        return createJsonResponse({
          hasPermission: false,
          error: 'Rate limit exceeded',
          empresas: [],
          isAdmin: false,
          permissions: getDefaultPermissions()
        }, 429, origin);
      }

      logError('No authorization header');

      await logAuditEvent(adminSupabase, {
        eventType: 'security',
        action: 'missing_auth_header',
        granted: false,
        ipAddress: clientIp,
        userAgent
      });

      return createJsonResponse({
        hasPermission: false,
        error: 'No authorization header',
        empresas: [],
        isAdmin: false,
        permissions: getDefaultPermissions()
      }, 401, origin);
    }

    logInfo('Auth header found, validating user');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await adminSupabase.auth.getUser(token);

    if (userError || !user) {
      logError('Invalid user', userError);

      await logAuditEvent(adminSupabase, {
        eventType: 'auth',
        action: 'invalid_token',
        granted: false,
        ipAddress: clientIp,
        userAgent
      });

      return createJsonResponse({
        hasPermission: false,
        error: 'Invalid user',
        empresas: [],
        isAdmin: false,
        permissions: getDefaultPermissions()
      }, 401, origin);
    }

    const rateLimitCheck = await checkRateLimit(adminSupabase, user.id, 'user', req.method);

    if (!rateLimitCheck.allowed) {
      await logAuditEvent(adminSupabase, {
        userId: user.id,
        eventType: 'security',
        action: 'rate_limit_exceeded',
        granted: false,
        ipAddress: clientIp,
        userAgent,
        metadata: { endpoint: req.method }
      });

      return createJsonResponse({
        hasPermission: false,
        error: 'Rate limit exceeded',
        empresas: [],
        isAdmin: false,
        permissions: getDefaultPermissions()
      }, 429, origin);
    }

    logInfo('User validated');
    logInfo('Fetching perfil from database');

    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    const { data: perfil, error: perfilError } = await adminSupabase
      .from('perfis')
      .select(`
        *,
        grupo:grupo_id(
          id,
          nome,
          permissoes
        )
      `)
      .eq('id', user.id)
      .maybeSingle();

    if (perfilError) {
      logError('Error fetching perfil', perfilError);
      throw perfilError;
    }

    if (!perfil) {
      logError('Perfil not found for user');

      await logAuditEvent(adminSupabase, {
        userId: user.id,
        eventType: 'auth',
        action: 'perfil_not_found',
        granted: false,
        ipAddress: clientIp,
        userAgent
      });

      return createJsonResponse({
        hasPermission: false,
        error: 'Perfil não encontrado',
        userInactive: false,
        empresas: [],
        isAdmin: false,
        permissions: getDefaultPermissions()
      }, 404, origin);
    }

    if (!perfil.ativo) {
      logInfo('User is inactive');

      await logAuditEvent(adminSupabase, {
        userId: user.id,
        eventType: 'auth',
        action: 'inactive_user_blocked',
        granted: false,
        ipAddress: clientIp,
        userAgent,
        metadata: { email: perfil.email }
      });

      return createJsonResponse({
        hasPermission: false,
        error: 'Usuário inativo',
        userInactive: true,
        empresas: [],
        isAdmin: false,
        permissions: getDefaultPermissions()
      }, 403, origin);
    }

    logInfo('Perfil found, checking grupo');

    let grupo = perfil.grupo;
    if (Array.isArray(grupo) && grupo.length > 0) {
      grupo = grupo[0];
    }

    if (!perfil.grupo_id || !grupo) {
      logInfo('User without group - denying access');

      await logAuditEvent(adminSupabase, {
        userId: user.id,
        eventType: 'auth',
        action: 'user_without_group_blocked',
        granted: false,
        ipAddress: clientIp,
        userAgent,
        metadata: { email: perfil.email }
      });

      return createJsonResponse({
        hasPermission: false,
        isAdmin: false,
        permissions: getDefaultPermissions(),
        error: 'Usuário sem grupo atribuído',
        empresas: [],
        empresasCount: 0
      }, 403, origin);
    }

    const permissions: Permissions = {
      admin: grupo.permissoes?.admin || false,
      edit_data: grupo.permissoes?.edit_data || false,
      delete_data: grupo.permissoes?.delete_data || false,
      menus: grupo.permissoes?.menus || []
    };

    const isAdmin = permissions.admin;
    logInfo('Grupo found, isAdmin:', isAdmin);

    if (req.method === 'GET') {
      logInfo('Fetching permissions and empresas for GET request');

      const empresas = await getUserEmpresas(
        isAdmin ? adminSupabase : userSupabase,
        user.id,
        isAdmin
      );

      return createJsonResponse({
        hasPermission: true,
        isAdmin: isAdmin,
        permissions: permissions,
        grupo: {
          id: grupo.id,
          nome: grupo.nome
        },
        perfil: {
          id: perfil.id,
          nome: perfil.nome,
          email: perfil.email
        },
        empresas: empresas,
        empresasCount: empresas.length
      }, 200, origin);
    }

    if (req.method === 'POST') {
      const contentLength = req.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > 10240) {
        await logAuditEvent(adminSupabase, {
          userId: user.id,
          eventType: 'security',
          action: 'request_too_large',
          granted: false,
          ipAddress: clientIp,
          userAgent
        });

        return createJsonResponse({
          hasPermission: false,
          error: 'Request too large',
          empresas: [],
          isAdmin: false,
          permissions: getDefaultPermissions()
        }, 413, origin);
      }

      const body = await req.json();
      const validatedRequest = validatePermissionRequest(body);

      if (!validatedRequest) {
        await logAuditEvent(adminSupabase, {
          userId: user.id,
          eventType: 'security',
          action: 'invalid_request_body',
          granted: false,
          ipAddress: clientIp,
          userAgent,
          metadata: { body }
        });

        return createJsonResponse({
          hasPermission: false,
          error: 'Invalid request body',
          empresas: [],
          isAdmin: false,
          permissions: getDefaultPermissions()
        }, 400, origin);
      }

      const { action, resource } = validatedRequest;

      let hasPermission = false;

      if (permissions.admin) {
        hasPermission = true;
      } else {
        switch (action) {
          case 'view_menu':
            if (resource && permissions.menus) {
              hasPermission = permissions.menus.includes(resource);
            }
            break;
          case 'edit_data':
            hasPermission = permissions.edit_data || false;
            break;
          case 'delete_data':
            hasPermission = permissions.delete_data || false;
            break;
          default:
            hasPermission = false;
        }
      }

      if (!hasPermission) {
        await logAuditEvent(adminSupabase, {
          userId: user.id,
          eventType: 'security',
          action: 'access_denied',
          resource: resource || action,
          granted: false,
          ipAddress: clientIp,
          userAgent,
          metadata: {
            action,
            resource,
            grupo: grupo.nome,
            permissions
          }
        });
      }

      return createJsonResponse({
        hasPermission,
        isAdmin: permissions.admin,
        action,
        resource
      }, 200, origin);
    }

    return createJsonResponse({
      hasPermission: false,
      error: 'Método não permitido',
      empresas: [],
      isAdmin: false,
      permissions: getDefaultPermissions()
    }, 405, origin);

  } catch (error) {
    logError('Error in check-permissions', error);
    return createJsonResponse({
      hasPermission: false,
      error: error.message || 'Internal server error',
      empresas: [],
      isAdmin: false,
      permissions: getDefaultPermissions()
    }, 500, origin);
  }
});