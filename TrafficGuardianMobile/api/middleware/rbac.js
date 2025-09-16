const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          required_permission: requiredPermission
        });
      }

      // Check if user has the required permission
      if (!req.user.permissions || !req.user.permissions.includes(requiredPermission)) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required_permission: requiredPermission,
          user_permissions: req.user.permissions || []
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ 
        error: 'Permission check failed' 
      });
    }
  };
};

const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          allowed_roles: allowedRoles
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ 
          error: 'Role not authorized',
          user_role: req.user.role,
          allowed_roles: allowedRoles
        });
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      return res.status(500).json({ 
        error: 'Role check failed' 
      });
    }
  };
};

// Permission definitions by role
const ROLE_PERMISSIONS = {
  admin: [
    'view_all_incidents',
    'manage_incidents', 
    'view_analytics',
    'manage_users',
    'view_public_data',
    'report_incidents',
    'update_incidents',
    'create_reports'
  ],
  field_responder: [
    'view_incidents',
    'update_incidents',
    'create_reports',
    'view_public_data',
    'report_incidents'
  ],
  citizen: [
    'view_public_data',
    'report_incidents'
  ]
};

// Check if user has any of the specified permissions
const checkAnyPermission = (permissions) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          required_permissions: permissions
        });
      }

      const hasPermission = permissions.some(permission => 
        req.user.permissions && req.user.permissions.includes(permission)
      );

      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required_permissions: permissions,
          user_permissions: req.user.permissions || []
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ 
        error: 'Permission check failed' 
      });
    }
  };
};

// Check if user has all of the specified permissions
const checkAllPermissions = (permissions) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          required_permissions: permissions
        });
      }

      const hasAllPermissions = permissions.every(permission => 
        req.user.permissions && req.user.permissions.includes(permission)
      );

      if (!hasAllPermissions) {
        const missingPermissions = permissions.filter(permission => 
          !req.user.permissions || !req.user.permissions.includes(permission)
        );

        return res.status(403).json({ 
          error: 'Missing required permissions',
          missing_permissions: missingPermissions,
          user_permissions: req.user.permissions || []
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ 
        error: 'Permission check failed' 
      });
    }
  };
};

