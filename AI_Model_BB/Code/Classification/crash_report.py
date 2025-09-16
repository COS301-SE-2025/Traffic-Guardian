"""
Enhanced data structure for crash incident reports.
Provides a standardized format for crash incident data.
"""
from dataclasses import dataclass

@dataclass
class CrashReport:
    """Enhanced data structure for crash incident reports."""
    incident_datetime: str
    incident_latitude: float
    incident_longitude: float
    incident_severity: str
    incident_status: str
    incident_reporter: str
    alerts_message: str
    incident_type: str
    confidence: float
    video_path: str
    processing_timestamp: str
    # Enhanced crash-specific fields
    vehicles_involved: int
    impact_severity: str
    crash_phase: str  # pre_impact, impact, post_impact
    estimated_speed: str
    damage_assessment: str
    emergency_priority: str
    # Camera-specific fields
    camera_id: str = None
    camera_location: str = None # MIGHT NEED TO REMOVE (EXCESS)
    camera_longitude: str = None
    camera_latitude: str = None
    # Incident filename fields
    timestamp: str = None
    milliseconds: str = None
    full_timestamp: str = None
    original_incident_type: str = None
    # Display fields (for compatibility)
    severity: str = None
    description: str = None