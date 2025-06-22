import os
import sys


def verify_project_structure():
    """Verify the project structure is correct"""

    print("🔍 Verifying Project Structure...")
    print("=" * 50)

    # Get paths
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(current_dir)
    code_folder = os.path.join(project_root, "Code")
    videos_folder = os.path.join(code_folder, "Videos")

    print(f"Current directory (Testing): {current_dir}")
    print(f"Project root: {project_root}")
    print(f"Code folder: {code_folder}")
    print(f"Videos folder: {videos_folder}")

    # Check structure
    checks = []

    # Check Code folder
    if os.path.exists(code_folder):
        checks.append(("✅", "Code folder exists"))

        # Check for Python files
        code_files = [f for f in os.listdir(code_folder) if f.endswith(".py")]
        if code_files:
            checks.append(("✅", f"Python files found: {code_files}"))
        else:
            checks.append(("❌", "No Python files found in Code folder"))

        # Check for Videos folder
        if os.path.exists(videos_folder):
            checks.append(("✅", "Videos folder exists"))

            # Check for video files
            video_files = [
                f
                for f in os.listdir(videos_folder)
                if f.lower().endswith((".mp4", ".avi", ".mov", ".wmv"))
            ]
            if video_files:
                checks.append(("✅", f"Video files found: {video_files}"))
            else:
                checks.append(("⚠️", "No video files found in Videos folder"))
        else:
            checks.append(("❌", "Videos folder not found"))
    else:
        checks.append(("❌", "Code folder not found"))

    # Check Testing folder files
    testing_files = [f for f in os.listdir(current_dir) if f.endswith(".py")]
    if testing_files:
        checks.append(("✅", f"Test files found: {testing_files}"))
    else:
        checks.append(("❌", "No test files found in Testing folder"))

    print("\n📋 Structure Check Results:")
    print("-" * 30)
    for status, message in checks:
        print(f"{status} {message}")

    return all(status == "✅" for status, _ in checks)


def test_imports():
    """Test if we can import the modules"""

    print(f"\n🔧 Testing Imports...")
    print("-" * 30)

    # Add Code folder to path
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(current_dir)
    code_folder = os.path.join(project_root, "Code")

    if code_folder not in sys.path:
        sys.path.insert(0, code_folder)

    import_results = []

    # Test video_processor import
    try:
        import video_processor

        import_results.append(("✅", "video_processor imported successfully"))

        # Check for VideoProcessor class
        if hasattr(video_processor, "VideoProcessor"):
            import_results.append(("✅", "VideoProcessor class found"))
        else:
            import_results.append(("❌", "VideoProcessor class not found"))

    except ImportError as e:
        import_results.append(("❌", f"video_processor import failed: {e}"))

    # Test car_detection import
    try:
        import car_detection

        import_results.append(("✅", "car_detection imported successfully"))

        # Check for detect_cars function
        if hasattr(car_detection, "detect_cars"):
            import_results.append(("✅", "detect_cars function found"))
        else:
            import_results.append(("❌", "detect_cars function not found"))

        # Check for CarDetector class (optional)
        if hasattr(car_detection, "CarDetector"):
            import_results.append(("✅", "CarDetector class found"))
        else:
            import_results.append(("⚠️", "CarDetector class not found (optional)"))

    except ImportError as e:
        import_results.append(("❌", f"car_detection import failed: {e}"))

    for status, message in import_results:
        print(f"{status} {message}")

    return all(status in ["✅", "⚠️"] for status, _ in import_results)


def check_dependencies():
    """Check if required dependencies are installed"""

    print(f"\n📦 Checking Dependencies...")
    print("-" * 30)

    dependencies = [
        ("cv2", "opencv-python"),
        ("numpy", "numpy"),
        ("unittest", "built-in"),
    ]

    results = []

    for module, package in dependencies:
        try:
            __import__(module)
            results.append(("✅", f"{package} is installed"))
        except ImportError:
            results.append(("❌", f"{package} is NOT installed"))

    for status, message in results:
        print(f"{status} {message}")

    return all(status == "✅" for status, _ in results)


def main():
    """Main verification function"""

    print("🚗 Car Detection Project Setup Verification")
    print("=" * 60)

    structure_ok = verify_project_structure()
    imports_ok = test_imports()
    deps_ok = check_dependencies()

    print(f"\n" + "=" * 60)
    print("📊 VERIFICATION SUMMARY")
    print("=" * 60)

    if structure_ok and imports_ok and deps_ok:
        print("✅ ALL CHECKS PASSED!")
        print("🚀 Ready to run tests!")
        print("\nNext steps:")
        print("  python run_tests.py              # Run all tests")
        print("  python run_tests.py --list       # List available tests")
        return True
    else:
        print("❌ SOME CHECKS FAILED!")
        print("\n🔧 Troubleshooting:")

        if not structure_ok:
            print("  - Check that your Code folder contains the Python files")
            print("  - Ensure Videos folder is inside the Code folder")

        if not imports_ok:
            print("  - Verify your Python files have the correct names")
            print("  - Check that functions/classes are properly defined")

        if not deps_ok:
            print("  - Install missing dependencies:")
            print("    pip install opencv-python numpy")

        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
