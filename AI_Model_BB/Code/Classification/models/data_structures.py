"""
Data structures and models for the Traffic Guardian AI classification system.
"""
from dataclasses import dataclass
from typing import Optional


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
    camera_id: Optional[str] = None
    camera_location: Optional[str] = None
    camera_longitude: Optional[str] = None
    camera_latitude: Optional[str] = None
    
    # Incident filename fields
    timestamp: Optional[str] = None
    milliseconds: Optional[str] = None
    full_timestamp: Optional[str] = None
    original_incident_type: Optional[str] = None
    
    # Display fields (for compatibility)
    severity: Optional[str] = None
    description: Optional[str] = None


# Custom Exception Classes
class VideoProcessingError(Exception):
    """Raised when video processing fails."""
    pass


class FilenameParsingError(Exception):
    """Raised when filename parsing fails."""
    pass


class APISubmissionError(Exception):
    """Raised when API submission fails."""
    pass
