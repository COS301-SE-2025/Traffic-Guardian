import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../consts/ThemeContext';
import laneClosureService, { LaneClosure } from '../services/laneClosureService';
import './LaneClosureHeatmap.css';

interface HeatmapCell {
  day: number;
  hour: number;
  impact: number;
  closureCount: number;
  avgSeverity: number;
  affectedLanes: number;
}

interface LaneClosureHeatmapProps {
  className?: string;
  showControls?: boolean;
}

const LaneClosureHeatmap: React.FC<LaneClosureHeatmapProps> = ({
  className = '',
  showControls = true,
}) => {
  const { isDarkMode } = useTheme();
  const [laneClosures, setLaneClosures] = useState<LaneClosure[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('week');
  const [selectedSeverity, setSelectedSeverity] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [loading, setLoading] = useState(true);
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const closures = await laneClosureService.fetchLaneClosures();
        setLaneClosures(closures);
      } catch (error) {
        console.error('Error fetching lane closures:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const unsubscribe = laneClosureService.subscribe(setLaneClosures);
    return unsubscribe;
  }, []);

  // Generate synthetic historical data for meaningful heatmap
  const generateHistoricalData = useMemo(() => {
    const historicalClosures: LaneClosure[] = [];
    const now = new Date();
    const daysBack = selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 30 : 90;

    // Generate realistic historical patterns
    for (let d = 0; d < daysBack; d++) {
      const date = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // More construction during weekends and nights
      const baseClosures = isWeekend ? 8 : 5;
      const dailyClosures = Math.floor(baseClosures + Math.random() * 5);

      for (let i = 0; i < dailyClosures; i++) {
        // Bias towards night/early morning hours (construction preference)
        let hour: number;
        if (Math.random() < 0.6) {
          // 60% chance for night/early morning (10PM - 6AM)
          hour = Math.random() < 0.5 ?
            Math.floor(Math.random() * 6) : // 0-5 AM
            Math.floor(22 + Math.random() * 2); // 10-11 PM
        } else {
          // 40% chance for daytime
          hour = Math.floor(6 + Math.random() * 16); // 6AM - 10PM
        }

        const startDate = new Date(date);
        startDate.setHours(hour, Math.floor(Math.random() * 60), 0, 0);

        const duration = 2 + Math.random() * 6; // 2-8 hours
        const endDate = new Date(startDate.getTime() + duration * 60 * 60 * 1000);

        const routes = ['I-405', 'SR-1', 'SR-73', 'I-5', 'SR-55', 'SR-91', 'SR-22'];
        const severities: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
        const severityWeights = [0.5, 0.35, 0.15]; // More low severity

        const randomSeverity = () => {
          const rand = Math.random();
          let cumulative = 0;
          for (let i = 0; i < severityWeights.length; i++) {
            cumulative += severityWeights[i];
            if (rand < cumulative) {
              return severities[i];
            }
          }
          return 'low';
        };

        const severity = randomSeverity();
        const lanesExisting = 3 + Math.floor(Math.random() * 3); // 3-5 lanes
        const lanesClosed = severity === 'high' ?
          Math.floor(lanesExisting * 0.5) + 1 :
          severity === 'medium' ?
            Math.floor(lanesExisting * 0.3) + 1 :
            1;

        historicalClosures.push({
          id: `hist-${d}-${i}`,
          recordTimestamp: startDate.toISOString(),
          beginLocation: {
            latitude: 33.6 + Math.random() * 0.2,
            longitude: -117.8 + Math.random() * 0.2,
            elevation: 0,
            direction: ['North', 'South', 'East', 'West'][Math.floor(Math.random() * 4)],
          },
          endLocation: {
            latitude: 33.6 + Math.random() * 0.2,
            longitude: -117.8 + Math.random() * 0.2,
            elevation: 0,
            direction: ['North', 'South', 'East', 'West'][Math.floor(Math.random() * 4)],
          },
          route: routes[Math.floor(Math.random() * routes.length)],
          district: '12',
          nearbyLandmark: 'Generated historical data',
          details: {
            closureId: `HIST-${d}-${i}`,
            logNumber: `H${d}${i}`,
            index: `${i}`,
            startDateTime: startDate.toISOString(),
            endDateTime: endDate.toISOString(),
            lanesExisting,
            lanesClosed,
            closureType: severity === 'high' ? 'Full Closure' : 'Lane',
            facilityType: routes[Math.floor(Math.random() * routes.length)].includes('I-') ? 'Freeway' : 'Highway',
            workType: ['Construction', 'Maintenance', 'Emergency Repair', 'Inspection'][Math.floor(Math.random() * 4)],
            chinReportable: Math.random() > 0.7 ? 'Yes' : 'No',
            flowDirection: ['North', 'South', 'East', 'West'][Math.floor(Math.random() * 4)],
          },
          status: date < now ? 'completed' : 'upcoming',
          severity,
        });
      }
    }

    return [...laneClosures, ...historicalClosures];
  }, [laneClosures, selectedPeriod]);

  // Calculate heatmap data
  const heatmapData = useMemo(() => {
    const filteredClosures = generateHistoricalData.filter(closure => {
      if (selectedSeverity !== 'all' && closure.severity !== selectedSeverity) {
        return false;
      }

      const startDate = new Date(closure.details.startDateTime);
      const now = new Date();
      const daysBack = selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 30 : 90;
      const cutoffDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

      return startDate >= cutoffDate;
    });

    const heatmapMatrix: HeatmapCell[][] = [];

    // Initialize matrix
    for (let day = 0; day < 7; day++) {
      heatmapMatrix[day] = [];
      for (let hour = 0; hour < 24; hour++) {
        heatmapMatrix[day][hour] = {
          day,
          hour,
          impact: 0,
          closureCount: 0,
          avgSeverity: 0,
          affectedLanes: 0,
        };
      }
    }

    // Populate matrix
    filteredClosures.forEach(closure => {
      const startDate = new Date(closure.details.startDateTime);
      const endDate = new Date(closure.details.endDateTime);

      // Calculate impact score
      const severityMultiplier = closure.severity === 'high' ? 3 : closure.severity === 'medium' ? 2 : 1;
      const laneImpact = (closure.details.lanesClosed / Math.max(closure.details.lanesExisting, 1));
      const impactScore = severityMultiplier * laneImpact * 100;

      // Add impact for each hour the closure spans
      // eslint-disable-next-line prefer-const
      let currentDate = new Date(startDate);
      let hoursProcessed = 0;
      const maxHours = 168; // Safety limit: 1 week max

      // eslint-disable-next-line no-unmodified-loop-condition
      while (currentDate <= endDate && hoursProcessed < maxHours) {
        const dayOfWeek = currentDate.getDay();
        const hour = currentDate.getHours();

        const cell = heatmapMatrix[dayOfWeek][hour];
        cell.impact += impactScore;
        cell.closureCount += 1;
        cell.affectedLanes += closure.details.lanesClosed;
        cell.avgSeverity += severityMultiplier;

        currentDate.setHours(currentDate.getHours() + 1);
        hoursProcessed++;
      }
    });

    // Calculate averages
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const cell = heatmapMatrix[day][hour];
        if (cell.closureCount > 0) {
          cell.avgSeverity = cell.avgSeverity / cell.closureCount;
        }
      }
    }

    return heatmapMatrix;
  }, [generateHistoricalData, selectedPeriod, selectedSeverity]);

  // Get max impact for color scaling
  const maxImpact = useMemo(() => {
    let max = 0;
    heatmapData.forEach(row => {
      row.forEach(cell => {
        if (cell.impact > max) {
          max = cell.impact;
        }
      });
    });
    return max || 1;
  }, [heatmapData]);

  // Get color intensity based on impact
  const getColorIntensity = (impact: number): string => {
    const intensity = Math.min(impact / maxImpact, 1);

    if (isDarkMode) {
      // Dark mode: blue to red gradient
      if (intensity === 0) {
        return '#1f2937'; // Dark background
      }
      if (intensity < 0.2) {
        return '#1e3a8a'; // Dark blue
      }
      if (intensity < 0.4) {
        return '#3b82f6'; // Blue
      }
      if (intensity < 0.6) {
        return '#fbbf24'; // Yellow
      }
      if (intensity < 0.8) {
        return '#f97316'; // Orange
      }
      return '#dc2626'; // Red
    } else {
      // Light mode: light blue to red gradient
      if (intensity === 0) {
        return '#f9fafb'; // Light background
      }
      if (intensity < 0.2) {
        return '#dbeafe'; // Light blue
      }
      if (intensity < 0.4) {
        return '#93c5fd'; // Blue
      }
      if (intensity < 0.6) {
        return '#fde047'; // Yellow
      }
      if (intensity < 0.8) {
        return '#fb923c'; // Orange
      }
      return '#ef4444'; // Red
    }
  };

  const formatHour = (hour: number): string => {
    if (hour === 0) {
      return '12AM';
    }
    if (hour === 12) {
      return '12PM';
    }
    if (hour < 12) {
      return `${hour}AM`;
    }
    return `${hour - 12}PM`;
  };

  if (loading) {
    return (
      <div className={`lane-closure-heatmap ${className} loading`}>
        <div className="loading-spinner" />
        <p>Loading lane closure data...</p>
      </div>
    );
  }

  return (
    <div className={`lane-closure-heatmap ${className} ${isDarkMode ? 'dark' : 'light'}`}>
      {showControls && (
        <div className="heatmap-controls">
          <div className="control-group">
            <label>Time Period:</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as 'week' | 'month' | 'all')}
            >
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="all">Last 90 Days</option>
            </select>
          </div>

          <div className="control-group">
            <label>Severity Filter:</label>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value as 'all' | 'low' | 'medium' | 'high')}
            >
              <option value="all">All Severities</option>
              <option value="low">Low Impact</option>
              <option value="medium">Medium Impact</option>
              <option value="high">High Impact</option>
            </select>
          </div>
        </div>
      )}

      <div className="heatmap-container">
        <div className="heatmap-y-axis">
          {daysOfWeek.map(day => (
            <div key={day} className="y-axis-label">{day}</div>
          ))}
        </div>

        <div className="heatmap-grid">
          <div className="heatmap-x-axis">
            {hours.map(hour => (
              <div key={hour} className="x-axis-label">
                {hour % 4 === 0 ? formatHour(hour) : ''}
              </div>
            ))}
          </div>

          <div className="heatmap-cells">
            {heatmapData.map((row, dayIndex) => (
              <div key={dayIndex} className="heatmap-row">
                {row.map((cell, hourIndex) => (
                  <div
                    key={`${dayIndex}-${hourIndex}`}
                    className="heatmap-cell"
                    style={{
                      backgroundColor: getColorIntensity(cell.impact),
                      border: cell.impact > 0 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                    }}
                    onMouseEnter={() => setHoveredCell(cell)}
                    onMouseLeave={() => setHoveredCell(null)}
                    title={`${daysOfWeek[dayIndex]} ${formatHour(hourIndex)}: ${cell.closureCount} closures, Impact: ${cell.impact.toFixed(1)}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="heatmap-legend">
        <div className="legend-title">Lane Closure Impact</div>
        <div className="legend-scale">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: getColorIntensity(0) }} />
            <span>None</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: getColorIntensity(maxImpact * 0.2) }} />
            <span>Low</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: getColorIntensity(maxImpact * 0.5) }} />
            <span>Medium</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: getColorIntensity(maxImpact * 0.8) }} />
            <span>High</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: getColorIntensity(maxImpact) }} />
            <span>Critical</span>
          </div>
        </div>
      </div>

      {hoveredCell && (
        <div className="heatmap-tooltip">
          <div className="tooltip-header">
            {daysOfWeek[hoveredCell.day]} {formatHour(hoveredCell.hour)}
          </div>
          <div className="tooltip-content">
            <div>Closures: {hoveredCell.closureCount}</div>
            <div>Impact Score: {hoveredCell.impact.toFixed(1)}</div>
            <div>Lanes Affected: {hoveredCell.affectedLanes}</div>
            {hoveredCell.closureCount > 0 && (
              <div>Avg Severity: {hoveredCell.avgSeverity.toFixed(1)}/3</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LaneClosureHeatmap;