import React from 'react';

const CarLoadingAnimation = () => {
  const styles = `
    @keyframes drive {
      0% {
        left: -25px;
        transform: translateY(-50%) scale(1);
      }
      50% {
        transform: translateY(-52%) scale(1.05);
      }
      100% {
        left: 255px;
        transform: translateY(-50%) scale(1);
      }
    }

    @keyframes dashMove {
      0% {
        transform: translateY(-50%) translateX(0);
      }
      100% {
        transform: translateY(-50%) translateX(-40px);
      }
    }

    @keyframes dots {
      0%, 25% {
        opacity: 0;
      }
      50% {
        opacity: 1;
      }
      75%, 100% {
        opacity: 0;
      }
    }

    .car-animation {
      animation: drive 3s ease-in-out infinite;
    }

    .dash-animation {
      animation: dashMove 2s linear infinite;
    }

    .dot1 {
      animation: dots 1.5s infinite;
    }

    .dot2 {
      animation: dots 1.5s infinite 0.5s;
    }

    .dot3 {
      animation: dots 1.5s infinite 1s;
    }
  `;

  return (
    <>
      <style>{styles}</style>
      <div
        style={{
          position: 'fixed',
          top: '147px', // Account for navbar height
          left: 0,
          right: 0,
          bottom: 0,
          height: 'calc(100vh - 147px)', // Full height minus navbar
          background: 'var(--background-color)', // Use theme variable
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000, // Ensure it overlays other content
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '250px',
              height: '40px',
              background: '#2c2c2c',
              borderRadius: '30px',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div
              className="dash-animation"
              style={{
                width: '100%',
                height: '2px',
                background: `repeating-linear-gradient(
                  to right,
                  #ffeb3b 0px,
                  #ffeb3b 20px,
                  transparent 20px,
                  transparent 40px
                )`,
                position: 'absolute',
                top: '50%',
                left: '0',
                transform: 'translateY(-50%)',
              }}
            />

            <div
              className="car-animation"
              style={{
                width: '20px',
                height: '12px',
                background: '#3498db',
                borderRadius: '3px',
                position: 'absolute',
                top: '50%',
                transform: 'translateY(-50%)',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)',
              }}
            >
              {/* Left wheel */}
              <div
                style={{
                  width: '4px',
                  height: '4px',
                  background: '#333',
                  borderRadius: '50%',
                  position: 'absolute',
                  bottom: '-2px',
                  left: '3px',
                }}
              />
              {/* Right wheel */}
              <div
                style={{
                  width: '4px',
                  height: '4px',
                  background: '#333',
                  borderRadius: '50%',
                  position: 'absolute',
                  bottom: '-2px',
                  right: '3px',
                }}
              />
              {/* Windshield */}
              <div
                style={{
                  width: '8px',
                  height: '4px',
                  background: '#74b9ff',
                  borderRadius: '1px 1px 0 0',
                  position: 'absolute',
                  top: '-4px',
                  left: '4px',
                }}
              />
            </div>
          </div>

          <div
            style={{
              marginTop: '20px',
              color: 'var(--text-color)', // Use theme variable
              fontSize: '14px',
              fontWeight: '300',
              letterSpacing: '1px',
            }}
          >
            LOADING
            <span className="dot1">.</span>
            <span className="dot2">.</span>
            <span className="dot3">.</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default CarLoadingAnimation;
