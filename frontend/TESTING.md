# Frontend Testing Guide

## Overview
This document outlines the testing setup and commands for the Traffic Guardian frontend application.

## Test Commands

### Core Commands
```bash
# Run all tests once (CI mode)
npm run test

# Run tests in watch mode (development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests for CI/CD (with coverage, no watch)
npm run test:ci
```

### Linting Commands
```bash
# Run ESLint (fails on warnings)
npm run lint

# Run ESLint and fix issues
npm run lint:fix

# Run Stylelint (fails on warnings)
npm run stylelint

# Run Stylelint and fix issues
npm run stylelint:fix

# Run all linters
npm run lint:all

# Run all linters and fix issues
npm run lint:all:fix
```

### Code Quality Commands
```bash
# Check code formatting
npm run format:check

# Format code
npm run format

# Type checking
npm run type-check

# Complete validation (lint + type-check + test)
npm run validate

# Pre-commit validation
npm run pre-commit
```

## Coverage Configuration

### Coverage Thresholds
- Statements: 50%
- Branches: 50%
- Functions: 50%
- Lines: 50%

### Coverage Exclusions
- TypeScript declaration files (`*.d.ts`)
- Entry point (`index.tsx`)
- Web vitals reporting (`reportWebVitals.ts`)
- Test setup (`setupTests.ts`)

## CI/CD Integration

### GitHub Actions
The project includes a comprehensive CI/CD pipeline in `.github/workflows/ci.yml`:

1. **Multi-Node Testing**: Tests on Node 18.x and 20.x
2. **Code Quality Checks**:
   - Prettier formatting
   - TypeScript compilation
   - ESLint and Stylelint
3. **Test Execution**: Full test suite with coverage
4. **Build Verification**: Ensures application builds successfully
5. **Super-Linter Integration**: Additional code quality validation

### Super-Linter Configuration
- Validates TypeScript, CSS, JSON, Markdown, and YAML
- Scoped to `frontend/` directory
- Uses project-specific configuration files

## Test Structure

### Test Files
- `src/components/Button.test.tsx` - Button component tests
- `src/components/StatsCard.test.tsx` - StatsCard component tests
- `src/utils/ProtectedRoute.test.tsx` - Authentication logic tests
- `src/services/apiService.test.ts` - API service tests
- `src/__tests__/integration/` - Integration tests

### Test Categories
1. **Unit Tests**: Individual component/function testing
2. **Integration Tests**: Component interaction testing
3. **API Tests**: Service layer testing with mocks

## Local Development

### Pre-commit Hook Setup
```bash
# Install dependencies
npm install

# Run pre-commit validation
npm run pre-commit
```

### Running Specific Tests
```bash
# Run specific test file
npm test Button.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="Button"

# Run tests with verbose output
npm test -- --verbose
```

## Configuration Files

### ESLint (`.eslintrc.json`)
- React and TypeScript rules
- Test-specific overrides
- Accessibility guidelines

### Stylelint (`.stylelintrc.json`)
- CSS standards enforcement
- Custom property patterns
- Indentation and formatting rules

### Prettier (`.prettierrc`)
- Code formatting standards
- 80-character line width
- Single quotes, trailing commas

### Jest Configuration
- Defined in `package.json`
- Coverage collection setup
- Threshold enforcement

## Best Practices

### Writing Tests
1. Use descriptive test names
2. Test both happy path and edge cases
3. Mock external dependencies
4. Maintain high coverage on business logic
5. Keep tests isolated and independent

### Code Quality
1. Run linters before committing
2. Maintain consistent formatting
3. Follow TypeScript best practices
4. Write self-documenting code
5. Keep components small and focused

## Troubleshooting

### Common Issues
1. **Tests failing in CI but passing locally**: Check Node version compatibility
2. **Coverage below threshold**: Add tests for uncovered code paths
3. **Linting errors**: Run `npm run lint:fix` to auto-fix issues
4. **Type errors**: Run `npm run type-check` for detailed information

### Debug Commands
```bash
# Debug specific test
npm test -- --testNamePattern="Button" --verbose

# Check what files are being tested
npm test -- --listTests

# Run tests with debug output
npm test -- --detectOpenHandles --forceExit
```