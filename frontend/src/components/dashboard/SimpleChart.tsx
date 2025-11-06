import React from 'react';

interface ChartDataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
}

interface SimpleChartProps {
  title: string;
  data: ChartDataPoint[];
  type?: 'line' | 'bar';
  height?: number;
  primaryColor?: string;
  secondaryColor?: string;
  showSecondary?: boolean;
}

const SimpleChart: React.FC<SimpleChartProps> = ({
  title,
  data,
  type = 'line',
  height = 200,
  primaryColor = '#3B82F6',
  secondaryColor = '#10B981',
  showSecondary = false,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-6'>
        <h3 className='text-lg font-semibold text-gray-900 mb-4'>{title}</h3>
        <div className='flex items-center justify-center h-48 text-gray-500'>
          No data available
        </div>
      </div>
    );
  }

  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.value, d.secondaryValue || 0))
  );
  const minValue = Math.min(
    ...data.map((d) => Math.min(d.value, d.secondaryValue || 0))
  );
  const range = maxValue - minValue || 1;

  const getYPosition = (value: number) => {
    return height - ((value - minValue) / range) * height;
  };

  const getBarHeight = (value: number) => {
    return ((value - minValue) / range) * height;
  };

  return (
    <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-6'>
      <h3 className='text-lg font-semibold text-gray-900 mb-4'>{title}</h3>

      <div className='relative' style={{ height: height + 40 }}>
        <svg width='100%' height={height + 40} className='overflow-visible'>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
            <g key={index}>
              <line
                x1='0'
                y1={height * ratio}
                x2='100%'
                y2={height * ratio}
                stroke='#E5E7EB'
                strokeWidth='1'
              />
              <text
                x='-10'
                y={height * ratio + 4}
                textAnchor='end'
                className='text-xs fill-gray-500'
              >
                {Math.round(maxValue - range * ratio)}
              </text>
            </g>
          ))}

          {type === 'line' ? (
            <>
              {/* Primary line */}
              <polyline
                fill='none'
                stroke={primaryColor}
                strokeWidth='2'
                points={data
                  .map((d, i) => {
                    const x = (i / (data.length - 1)) * 100;
                    const y = getYPosition(d.value);
                    return `${x}%,${y}`;
                  })
                  .join(' ')}
              />

              {/* Secondary line */}
              {showSecondary && (
                <polyline
                  fill='none'
                  stroke={secondaryColor}
                  strokeWidth='2'
                  strokeDasharray='5,5'
                  points={data
                    .map((d, i) => {
                      const x = (i / (data.length - 1)) * 100;
                      const y = getYPosition(d.secondaryValue || 0);
                      return `${x}%,${y}`;
                    })
                    .join(' ')}
                />
              )}

              {/* Data points */}
              {data.map((d, i) => (
                <g key={i}>
                  <circle
                    cx={`${(i / (data.length - 1)) * 100}%`}
                    cy={getYPosition(d.value)}
                    r='4'
                    fill={primaryColor}
                  />
                  {showSecondary && d.secondaryValue !== undefined && (
                    <circle
                      cx={`${(i / (data.length - 1)) * 100}%`}
                      cy={getYPosition(d.secondaryValue)}
                      r='4'
                      fill={secondaryColor}
                    />
                  )}
                </g>
              ))}
            </>
          ) : (
            <>
              {/* Bars */}
              {data.map((d, i) => {
                const barWidth = 80 / data.length;
                const x =
                  (i / data.length) * 100 + (100 / data.length - barWidth) / 2;

                return (
                  <g key={i}>
                    <rect
                      x={`${x}%`}
                      y={getYPosition(d.value)}
                      width={`${barWidth}%`}
                      height={getBarHeight(d.value)}
                      fill={primaryColor}
                      opacity='0.8'
                    />
                    {showSecondary && d.secondaryValue !== undefined && (
                      <rect
                        x={`${x + barWidth * 0.1}%`}
                        y={getYPosition(d.secondaryValue)}
                        width={`${barWidth * 0.8}%`}
                        height={getBarHeight(d.secondaryValue)}
                        fill={secondaryColor}
                        opacity='0.6'
                      />
                    )}
                  </g>
                );
              })}
            </>
          )}

          {/* X-axis labels */}
          {data.map((d, i) => (
            <text
              key={i}
              x={`${(i / (data.length - 1)) * 100}%`}
              y={height + 20}
              textAnchor='middle'
              className='text-xs fill-gray-500'
            >
              {d.label}
            </text>
          ))}
        </svg>
      </div>

      {/* Legend */}
      {showSecondary && (
        <div className='flex items-center justify-center mt-4 space-x-6'>
          <div className='flex items-center'>
            <div
              className='w-3 h-3 rounded-full mr-2'
              style={{ backgroundColor: primaryColor }}
            />
            <span className='text-sm text-gray-600'>Primary</span>
          </div>
          <div className='flex items-center'>
            <div
              className='w-3 h-3 rounded-full mr-2'
              style={{ backgroundColor: secondaryColor }}
            />
            <span className='text-sm text-gray-600'>Secondary</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleChart;
