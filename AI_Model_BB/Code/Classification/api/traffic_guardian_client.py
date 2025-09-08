"""
API client for TrafficGuardian system integration.
"""
import os
import requests
import logging
from typing import Dict

logger = logging.getLogger(__name__)


class TrafficGuardianAPIClient:
    """API client for submitting incidents to TrafficGuardian system."""
    
    def __init__(self):
        self.api_config = self._load_api_config()
        
    def _load_api_config(self) -> Dict:
        """Load API configuration from environment variables."""
        api_key = os.getenv('AIAPIKEY')
        return {
            'endpoint': os.getenv('API_ENDPOINT', 'http://localhost:5000/api/incidents'),
            'api_key': api_key,
            'enabled': bool(api_key) and os.getenv('API_ENABLED', 'false').lower() == 'true',
            'timeout': 30,
            'max_retries': 3
        }
    
    def _map_crash_report_to_api_payload(self, crash_report) -> Dict:
        """
        Map CrashReport object to TrafficGuardian API incident payload format.
        
        EXACT POSTMAN API FORMAT MAPPING:
        ================================
        CrashReport Field               → API Field (EXACT POSTMAN)
        -------------------------------------------------------------------------
        crash_report.incident_datetime  → Incidents_DateTime (date "YYYY-MM-DD")
        crash_report.incident_longitude → Incidents_Longitude (string, can be "")  
        crash_report.incident_latitude  → Incidents_Latitude (string, can be "")
        crash_report.incident_severity  → Incident_Severity ("high", "low", etc.)
        crash_report.incident_status    → Incident_Status ("open", "closed", etc.)
        "TrafficGuardianAI"            → Incident_Reporter (fixed value)
        crash_report.camera_id         → Incident_CameraID (integer)
        crash_report.alerts_message    → Incident_Description (string)
        
        Args:
            crash_report: CrashReport object from video analysis
            
        Returns:
            Dictionary formatted for API incident creation
        """
        # Map severity levels to API format (must match API validation)
        severity_mapping = {
            'low': 'low',
            'medium': 'medium', 
            'high': 'high',
            'critical': 'high'  # Map critical to high since API example shows "high"
        }
        
        # Map status - use classification-based status or default to ongoing
        status_mapping = {
            'active': 'open',
            'ongoing': 'open',
            'resolved': 'closed', 
            'closed': 'closed',
            'open': 'open'
        }
        
        # Extract camera ID - ensure it's an INTEGER for API (Postman shows: "Incident_CameraID": 2)
        try:
            camera_id = int(crash_report.camera_id.replace('cam', '').replace('camera', '')) if crash_report.camera_id else 1
        except (ValueError, AttributeError):
            camera_id = 1  # Default camera ID
        
        # Create API payload with EXACT field names and types from Postman example
        api_payload = {
            # Required database fields
            'Incidents_DateTime': crash_report.incident_datetime,
            'Incidents_Longitude': float(crash_report.incident_longitude),
            'Incidents_Latitude': float(crash_report.incident_latitude),
            'Incident_Severity': severity_mapping.get(crash_report.incident_severity, 'medium'),
            'Incident_Status': status_mapping.get(crash_report.incident_status, 'ongoing'),
            'Incident_Reporter': 'TrafficGuardianAI',
            'Incident_CameraID': camera_id,
            'Incident_Description': crash_report.alerts_message
        }
        
        logger.debug(f"🔄 Mapped crash report to API payload (EXACT POSTMAN FORMAT):")
        logger.debug(f"   Incidents_DateTime: {api_payload['Incidents_DateTime']}")
        logger.debug(f"   Incident_CameraID: {api_payload['Incident_CameraID']} (type: {type(api_payload['Incident_CameraID'])})")
        logger.debug(f"   Incident_Severity: {api_payload['Incident_Severity']}")
        logger.debug(f"   Incident_Status: {api_payload['Incident_Status']}")
        
        return api_payload
    
    def submit_incident(self, crash_report) -> Dict:
        """
        Submit incident report to TrafficGuardian API.
        
        Args:
            crash_report: CrashReport object from video analysis
            
        Returns:
            Dictionary with submission result
        """
        if not self.api_config['enabled']:
            return {'success': False, 'error': 'API not configured (missing API key)'}
        
        try:
            # Map crash report to API payload
            payload = self._map_crash_report_to_api_payload(crash_report)
            
            # Create headers
            headers = {
                "Content-Type": "application/json",
                "X-API-Key": self.api_config['api_key']
            }
            
            logger.info(f"🔍 Submitting incident to API")
            logger.debug(f"   Camera ID: {payload.get('Incident_CameraID')}")
            logger.debug(f"   Endpoint: {self.api_config['endpoint']}")
            
            # Send request
            response = requests.post(
                self.api_config['endpoint'],
                json=payload,
                headers=headers,
                timeout=self.api_config['timeout']
            )
            
            if response.status_code in [200, 201]:
                result_data = response.json()
                return {
                    'success': True,
                    'incident_id': result_data.get('incident_id'),
                    'status_code': response.status_code,
                    'response': result_data
                }
            else:
                logger.error(f"API submission failed: {response.status_code} - {response.text}")
                return {
                    'success': False,
                    'error': f"API error: {response.status_code}",
                    'details': response.text
                }
                
        except requests.exceptions.RequestException as e:
            logger.error(f"API request failed: {e}")
            return {
                'success': False,
                'error': f"Network error: {str(e)}"
            }
        except Exception as e:
            logger.error(f"Unexpected error during API submission: {e}")
            return {
                'success': False,
                'error': f"Unexpected error: {str(e)}"
            }
