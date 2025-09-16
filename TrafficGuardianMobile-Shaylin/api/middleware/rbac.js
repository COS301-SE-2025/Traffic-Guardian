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

// RBAC (Role-Based Access Control) Middleware

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

// Resource ownership check (for user's own data)
const checkResourceOwnership = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required' 
        });
      }

      // Admin can access all resources
      if (req.user.role === 'admin') {
        return next();
      }

      // Check if user owns the resource
      const resourceUserId = req.body[resourceUserIdField] || 
                           req.params[resourceUserIdField] || 
                           req.query[resourceUserIdField];

      if (resourceUserId && parseInt(resourceUserId) !== req.user.userId) {
        return res.status(403).json({ 
          error: 'Access denied - not resource owner',
          resource_user_id: resourceUserId,
          current_user_id: req.user.userId
        });
      }

      next();
    } catch (error) {
      console.error('Resource ownership check error:', error);
      return res.status(500).json({ 
        error: 'Ownership check failed' 
      });
    }
  };
};

// Rate limiting by role
const getRoleBasedRateLimit = (role) => {
  const limits = {
    admin: { windowMs: 15 * 60 * 1000, max: 200 }, // 200 requests per 15 minutes
    field_responder: { windowMs: 15 * 60 * 1000, max: 150 }, // 150 requests per 15 minutes
    citizen: { windowMs: 15 * 60 * 1000, max: 100 } // 100 requests per 15 minutes
  };

  return limits[role] || limits.citizen;
};

// Location-based access control (for emergency features)
const checkLocationAccess = (maxDistance = 50) => { // 50km default
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required' 
        });
      }

      // Admin and field responders have location access
      if (['admin', 'field_responder'].includes(req.user.role)) {
        return next();
      }

      // For citizens, check if they're in allowed area (mock implementation)
      const userLocation = req.body.location || req.query.location;
      
      if (!userLocation || !userLocation.latitude || !userLocation.longitude) {
        return res.status(400).json({ 
          error: 'Location required for this operation' 
        });
      }

      // Mock location validation - in real app, check against service area
      const isInServiceArea = true; // Would calculate actual distance to service boundary

      if (!isInServiceArea) {
        return res.status(403).json({ 
          error: 'Service not available in your location',
          max_distance: maxDistance
        });
      }

      next();
    } catch (error) {
      console.error('Location access check error:', error);
      return res.status(500).json({ 
        error: 'Location access check failed' 
      });
    }
  };
};

// Emergency override - allows certain actions during emergencies
const emergencyOverride = (req, res, next) => {
  try {
    // Check if this is an emergency request
    const isEmergency = req.headers['x-emergency'] === 'true' || 
                       req.body.emergency === true ||
                       req.query.emergency === 'true';

    if (isEmergency) {
      // Log emergency access
      console.log(`Emergency override used by user ${req.user?.userId} at ${new Date().toISOString()}`);
      
      // Grant elevated permissions for emergency
      req.user.emergency = true;
      req.user.permissions = [...(req.user.permissions || []), 'emergency_override'];
    }

    next();
  } catch (error) {
    console.error('Emergency override error:', error);
    next(); // Continue without override on error
  }
};

// Time-based access control (for maintenance windows, etc.)
const checkTimeRestrictions = (allowedHours = { start: 0, end: 24 }) => {
  return (req, res, next) => {
    try {
      const currentHour = new Date().getHours();
      
      if (currentHour < allowedHours.start || currentHour >= allowedHours.end) {
        // Admin always has access
        if (req.user?.role === 'admin') {
          return next();
        }

        return res.status(403).json({ 
          error: 'Service not available during this time',
          allowed_hours: allowedHours,
          current_hour: currentHour
        });
      }

      next();
    } catch (error) {
      console.error('Time restriction check error:', error);
      next(); // Continue on error to avoid blocking critical operations
    }
  };
};

module.exports = {
  checkPermission,
  checkRole,
  checkAnyPermission,
  checkAllPermissions,
  checkResourceOwnership,
  getRoleBasedRateLimit,
  checkLocationAccess,
  emergencyOverride,
  checkTimeRestrictions,
  ROLE_PERMISSIONS
};