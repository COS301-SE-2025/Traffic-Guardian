"""
Setup Verification for Advanced Incident Detection System
Checks if everything is properly configured before running tests
"""
import os
import sys
import importlib.util

def check_python_version():
    """Check if Python version is compatible"""
    print("🐍 Checking Python Version...")
    version = sys.version_info
    
    if version.major == 3 and version.minor >= 7:
        print(f"   ✅ Python {version.major}.{version.minor}.{version.micro} (Compatible)")
        return True
    else:
        print(f"   ❌ Python {version.major}.{version.minor}.{version.micro} (Requires Python 3.7+)")
        return False

def check_required_packages():
    """Check if all required packages are installed"""
    print("\n📦 Checking Required Packages...")
    
    required_packages = [
        ('cv2', 'opencv-python', 'Computer vision library'),
        ('numpy', 'numpy', 'Numerical computing'),
        ('torch', 'torch', 'PyTorch for YOLO models'),
        ('requests', 'requests', 'HTTP requests for API calls'),
        ('ultralytics', 'ultralytics', 'YOLOv8 implementation'),
    ]
    
    all_good = True
    
    for module_name, package_name, description in required_packages:
        try:
            __import__(module_name)
            print(f"   ✅ {package_name} - {description}")
        except ImportError:
            print(f"   ❌ {package_name} - MISSING ({description})")
            all_good = False
    
    if not all_good:
        print("\n   🔧 Install missing packages with:")
        print("   pip install opencv-python numpy torch ultralytics requests")
    
    return all_good

def check_folder_structure():
    """Check if folder structure is correct"""
    print("\n📁 Checking Folder Structure...")
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(current_dir)
    
    expected_structure = {
        'Code': 'Main code folder',
        'Testing': 'Test files folder (you are here)',
    }
    
    all_good = True
    
    for folder, description in expected_structure.items():
        folder_path = os.path.join(project_root, folder)
        if os.path.exists(folder_path):
            print(f"   ✅ {folder}/ - {description}")
        else:
            print(f"   ❌ {folder}/ - MISSING ({description})")
            all_good = False
    
    return all_good

def check_code_files():
    """Check if required code files exist"""
    print("\n📄 Checking Code Files...")
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    code_folder = os.path.join(os.path.dirname(current_dir), 'Code')
    
    if not os.path.exists(code_folder):
        print("   ❌ Code folder not found!")
        return False
    
    required_files = [
        ('incident_detection_system.py', 'Main AdvancedIncidentDetectionSystem class'),
    ]
    
    optional_files = [
        ('Videos/', 'Test videos folder'),
    ]
    
    all_good = True
    
    # Check required files
    for filename, description in required_files:
        file_path = os.path.join(code_folder, filename)
        if os.path.exists(file_path):
            print(f"   ✅ {filename} - {description}")
        else:
            print(f"   ❌ {filename} - MISSING ({description})")
            all_good = False
    
    # Check optional files
    for filename, description in optional_files:
        file_path = os.path.join(code_folder, filename)
        if os.path.exists(file_path):
            if filename.endswith('/'):
                # It's a directory
                files = os.listdir(file_path)
                video_files = [f for f in files if f.endswith(('.mp4', '.avi', '.mov', '.mkv'))]
                print(f"   ✅ {filename} - {description} ({len(video_files)} videos found)")
            else:
                print(f"   ✅ {filename} - {description}")
        else:
            print(f"   ⚠️ {filename} - Optional ({description})")
    
    return all_good

def check_test_files():
    """Check if test files exist"""
    print("\n🧪 Checking Test Files...")
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    test_files = [
        ('test_advanced_incident_detection.py', 'Main test file'),
        ('run_tests.py', 'Test runner'),
    ]
    
    all_good = True
    
    for filename, description in test_files:
        file_path = os.path.join(current_dir, filename)
        if os.path.exists(file_path):
            print(f"   ✅ {filename} - {description}")
        else:
            print(f"   ❌ {filename} - MISSING ({description})")
            all_good = False
    
    return all_good

def check_system_import():
    """Check if the main system can be imported"""
    print("\n🚀 Checking System Import...")
    
    try:
        # Add Code folder to path
        current_dir = os.path.dirname(os.path.abspath(__file__))
        code_folder = os.path.join(os.path.dirname(current_dir), 'Code')
        
        if code_folder not in sys.path:
            sys.path.insert(0, code_folder)
        
        # Try to import
        from incident_detection_system import AdvancedIncidentDetectionSystem
        print("   ✅ AdvancedIncidentDetectionSystem imported successfully")
        
        # Check key methods
        required_methods = [
            '_detect_objects',
            '_update_vehicle_tracking',
            '_detect_incidents_multilayer',
            '_send_incident_to_api'
        ]
        
        missing_methods = []
        for method in required_methods:
            if not hasattr(AdvancedIncidentDetectionSystem, method):
                missing_methods.append(method)
        
        if missing_methods:
            print(f"   ❌ Missing methods: {', '.join(missing_methods)}")
            return False
        else:
            print(f"   ✅ All required methods found")
            return True
            
    except ImportError as e:
        print(f"   ❌ Import failed: {e}")
        print("      Make sure you have saved your AdvancedIncidentDetectionSystem as 'incident_detection_system.py'")
        return False
    except Exception as e:
        print(f"   ❌ Unexpected error: {e}")
        return False

def check_yolo_models():
    """Check if YOLO models can be loaded"""
    print("\n🤖 Checking YOLO Model Access...")
    
    try:
        from ultralytics import YOLO
        print("   ✅ Ultralytics YOLO imported successfully")
        
        # Try to create a model (this will download if needed)
        print("   📥 Checking YOLOv8 model (may download first time)...")
        model = YOLO('yolov8n.pt')  # Use nano model for faster download
        print("   ✅ YOLOv8 model loaded successfully")
        return True
        
    except Exception as e:
        print(f"   ⚠️ YOLO model check failed: {e}")
        print("      This is okay - models will be downloaded when first used")
        return True  # Don't fail setup for this

def generate_setup_report():
    """Generate a comprehensive setup report"""
    print("\n" + "=" * 70)
    print("🎯 SETUP VERIFICATION REPORT")
    print("=" * 70)
    
    checks = [
        ("Python Version", check_python_version()),
        ("Required Packages", check_required_packages()),
        ("Folder Structure", check_folder_structure()),
        ("Code Files", check_code_files()),
        ("Test Files", check_test_files()),
        ("System Import", check_system_import()),
        ("YOLO Models", check_yolo_models()),
    ]
    
    passed = sum(1 for _, result in checks if result)
    total = len(checks)
    
    print(f"\n📊 SUMMARY: {passed}/{total} checks passed")
    
    if passed == total:
        print("\n🎉 SETUP COMPLETE!")
        print("   Your system is ready for testing.")
        print("   Run: python run_tests.py")
        return True
    else:
        print("\n⚠️ SETUP INCOMPLETE")
        print("   Please fix the issues marked with ❌ above.")
        
        failed_checks = [name for name, result in checks if not result]
        print(f"   Failed checks: {', '.join(failed_checks)}")
        return False

def main():
    """Main setup verification function"""
    print("🔧 Advanced Incident Detection System - Setup Verification")
    print("=" * 70)
    print("This script checks if your system is ready for testing.")
    print()
    
    success = generate_setup_report()
    
    if success:
        print("\n🚀 Next Steps:")
        print("   1. Run all tests: python run_tests.py")
        print("   2. Run specific tests: python run_tests.py TestCollisionDetection")
        print("   3. List available tests: python run_tests.py --list")
    else:
        print("\n🔧 Setup Help:")
        print("   1. Make sure all required packages are installed")
        print("   2. Verify your AdvancedIncidentDetectionSystem code is saved as 'incident_detection_system.py'")
        print("   3. Check that folder structure is correct")
    
    return success

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
