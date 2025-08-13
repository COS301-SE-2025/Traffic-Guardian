"""
ML Incident Trainer Module
Save this as: ml_incident_trainer.py
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.preprocessing import StandardScaler
import joblib
import json
from datetime import datetime
import os

class MLEnhancedIncidentDetector:
    def __init__(self, base_detector):
        """ML enhancement for incident detection."""
        self.base_detector = base_detector
        self.ml_models = {}
        self.feature_scaler = StandardScaler()
        self.training_data = []
        self.is_trained = False
        
        # Create training directory
        os.makedirs('ml_training', exist_ok=True)
        
        # Feature names for interpretability
        self.feature_names = [
            'distance_between_vehicles',
            'relative_speed', 
            'angle_of_approach',
            'time_to_collision',
            'velocity_magnitude_1',
            'velocity_magnitude_2',
            'acceleration_1',
            'acceleration_2',
            'size_ratio',
            'confidence_product',
            'depth_difference',
            'optical_flow_magnitude',
            'trajectory_consistency'
        ]
        
        print("🤖 ML Enhancement initialized")
        
    def extract_collision_features(self, incident):
        """Extract numerical features from collision incident."""
        try:
            # Get vehicle data from incident
            positions = incident.get('positions', [[0, 0], [0, 0]])
            vehicles = incident.get('vehicles', ['car', 'car'])
            
            # Basic features from incident data
            pos1, pos2 = positions[0], positions[1]
            distance = np.sqrt((pos2[0] - pos1[0])**2 + (pos2[1] - pos1[1])**2)
            
            # Get from validation layers
            validation_layers = incident.get('validation_layers', {})
            layer_analysis = incident.get('layer_analysis', {})
            
            # Extract features with safe defaults
            features = [
                distance,  # distance_between_vehicles
                incident.get('relative_speed', 10.0),  # relative_speed
                incident.get('approach_angle', 45.0),  # angle_of_approach  
                incident.get('time_to_collision', 2.0),  # time_to_collision
                incident.get('vehicle1_speed', 15.0),  # velocity_magnitude_1
                incident.get('vehicle2_speed', 15.0),  # velocity_magnitude_2
                incident.get('vehicle1_accel', 5.0),   # acceleration_1
                incident.get('vehicle2_accel', 5.0),   # acceleration_2
                1.2,  # size_ratio (default)
                incident.get('confidence', 0.8),       # confidence_product
                layer_analysis.get('depth', {}).get('depth_difference', 0.3),  # depth_difference
                layer_analysis.get('optical_flow', {}).get('magnitude1', 15.0), # optical_flow_magnitude
                0.7   # trajectory_consistency (default)
            ]
            
            # Ensure all features are numeric
            features = [float(f) if f is not None else 0.0 for f in features]
            
            return features
            
        except Exception as e:
            print(f"Feature extraction error: {e}")
            # Return default feature vector
            return [30.0, 10.0, 45.0, 2.0, 15.0, 15.0, 5.0, 5.0, 1.2, 0.8, 0.3, 15.0, 0.7]
    
    def collect_training_sample(self, incident, is_actual_incident):
        """Collect a labeled training sample."""
        features = self.extract_collision_features(incident)
        
        sample = {
            'features': features,
            'label': is_actual_incident,
            'timestamp': datetime.now().isoformat(),
            'incident_type': incident['type'],
            'severity': incident.get('severity', 'MEDIUM'),
            'confidence': incident.get('confidence', 0.0)
        }
        
        self.training_data.append(sample)
        
        # Auto-save every 5 samples
        if len(self.training_data) % 5 == 0:
            self.save_training_data()
        
        print(f"✅ Sample {len(self.training_data)}: {'REAL' if is_actual_incident else 'FALSE'}")
        
        # Auto-train when we have enough data
        if len(self.training_data) >= 20 and len(self.training_data) % 10 == 0:
            print(f"Auto-training with {len(self.training_data)} samples...")
            self.train_model()
    
    def train_model(self):
        """Train the ML model on collected data."""
        if len(self.training_data) < 10:
            print(f"Need at least 10 samples, have {len(self.training_data)}")
            return False
        
        # Check data balance
        positive_count = sum(1 for s in self.training_data if s['label'])
        negative_count = len(self.training_data) - positive_count
        
        print(f"\n🎯 Training ML model...")
        print(f"   Data: {len(self.training_data)} samples ({positive_count} real, {negative_count} false)")
        
        if positive_count < 3 or negative_count < 3:
            print("⚠️ Need at least 3 samples of each class")
            return False
        
        # Prepare data
        X = np.array([sample['features'] for sample in self.training_data])
        y = np.array([sample['label'] for sample in self.training_data])
        
        # Scale features
        X_scaled = self.feature_scaler.fit_transform(X)
        
        # Train Random Forest with good defaults
        self.ml_models['classifier'] = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42
        )
        
        self.ml_models['classifier'].fit(X_scaled, y)
        
        # Cross-validation score
        cv_scores = cross_val_score(self.ml_models['classifier'], X_scaled, y, cv=min(5, len(self.training_data)//2))
        
        print(f"✅ Model trained!")
        print(f"   Cross-validation accuracy: {cv_scores.mean():.3f} ± {cv_scores.std():.3f}")
        
        # Feature importance
        importance = self.ml_models['classifier'].feature_importances_
        print(f"\n🔍 Top 5 Important Features:")
        feature_importance = list(zip(self.feature_names, importance))
        feature_importance.sort(key=lambda x: x[1], reverse=True)
        
        for name, imp in feature_importance[:5]:
            print(f"   {name}: {imp:.3f}")
        
        self.is_trained = True
        self.save_models()
        return True
    
    def predict_incident_probability(self, incident):
        """Predict probability that an incident is real."""
        if not self.is_trained:
            return 0.5
        
        try:
            features = self.extract_collision_features(incident)
            features_scaled = self.feature_scaler.transform([features])
            
            probability = self.ml_models['classifier'].predict_proba(features_scaled)[0][1]
            return probability
            
        except Exception as e:
            print(f"ML prediction error: {e}")
            return 0.5
    
    def save_training_data(self):
        """Save training data."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"ml_training/training_data_{timestamp}.json"
        
        # Also save latest version
        latest_filename = "ml_training/training_data_latest.json"
        
        for fname in [filename, latest_filename]:
            with open(fname, 'w') as f:
                json.dump(self.training_data, f, indent=2)
        
        print(f"Training data saved ({len(self.training_data)} samples)")
    
    def load_training_data(self, filename="ml_training/training_data_latest.json"):
        """Load existing training data."""
        try:
            with open(filename, 'r') as f:
                self.training_data = json.load(f)
            print(f"Loaded {len(self.training_data)} training samples")
            return True
        except FileNotFoundError:
            print(f"No existing training data found at {filename}")
            return False
        except Exception as e:
            print(f"Error loading training data: {e}")
            return False
    
    def save_models(self):
        """Save trained models."""
        if not self.is_trained:
            return
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save model and scaler
        joblib.dump(self.ml_models['classifier'], f"ml_training/model_{timestamp}.pkl")
        joblib.dump(self.feature_scaler, f"ml_training/scaler_{timestamp}.pkl")
        
        # Save latest versions
        joblib.dump(self.ml_models['classifier'], "ml_training/model_latest.pkl")
        joblib.dump(self.feature_scaler, "ml_training/scaler_latest.pkl")
        
        print(f"🤖 Models saved")
    
    def load_models(self, model_file="ml_training/model_latest.pkl", 
                   scaler_file="ml_training/scaler_latest.pkl"):
        """Load pre-trained models."""
        try:
            self.ml_models['classifier'] = joblib.load(model_file)
            self.feature_scaler = joblib.load(scaler_file)
            self.is_trained = True
            print("ML models loaded successfully")
            return True
        except FileNotFoundError:
            print("No trained models found")
            return False
        except Exception as e:
            print(f"Error loading models: {e}")
            return False
    
    def get_training_stats(self):
        """Get current training statistics."""
        if not self.training_data:
            return None
        
        positive_count = sum(1 for s in self.training_data if s['label'])
        negative_count = len(self.training_data) - positive_count
        
        return {
            'total_samples': len(self.training_data),
            'positive_samples': positive_count,
            'negative_samples': negative_count,
            'balance_ratio': positive_count / max(negative_count, 1),
            'is_trained': self.is_trained
        }