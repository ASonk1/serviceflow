import { CalendarIcon, ChartIcon, ClockIcon } from "@/components/ui/icons";

const schedule = [
  { time: "09:00", name: "Maya Chen", service: "Strategy session", tone: "violet" },
  { time: "11:30", name: "Leo Martin", service: "Progress review", tone: "mint" },
  { time: "14:00", name: "Amara Reed", service: "Discovery call", tone: "blue" },
];

export function ProductPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`product-preview ${compact ? "product-preview-compact" : ""}`}>
      <div className="preview-chrome">
        <div className="preview-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="preview-address">app.serviceflow.demo</div>
        <div className="preview-live"><span /> Live preview</div>
      </div>
      <div className="preview-app">
        <aside className="preview-sidebar" aria-label="Illustrative dashboard navigation">
          <div className="preview-mini-logo" aria-hidden="true">S</div>
          <span className="preview-nav-active"><CalendarIcon /></span>
          <span><ChartIcon /></span>
          <span><ClockIcon /></span>
          <span className="preview-avatar">AR</span>
        </aside>
        <div className="preview-content">
          <div className="preview-topline">
            <div>
              <p className="preview-kicker">Tuesday · 18 June</p>
              <h3>Good morning, Alex</h3>
            </div>
            <div className="preview-status"><span /> All systems flowing</div>
          </div>
          <div className="preview-metrics">
            <article>
              <p>Today</p>
              <strong>8 bookings</strong>
              <span>2 spots open</span>
            </article>
            <article>
              <p>This week</p>
              <strong>£2,480</strong>
              <span className="metric-positive">↑ 12% pace</span>
            </article>
            <article>
              <p>Client return</p>
              <strong>68%</strong>
              <span>Healthy rhythm</span>
            </article>
          </div>
          <div className="preview-grid">
            <section className="preview-schedule" aria-label="Illustrative appointment schedule">
              <div className="preview-section-title">
                <div>
                  <p>Schedule</p>
                  <span>Local time · Europe/London</span>
                </div>
                <span className="preview-date-chip">Today</span>
              </div>
              <div className="preview-timeline">
                {schedule.map((item) => (
                  <div className="preview-appointment" key={item.time}>
                    <time>{item.time}</time>
                    <span className={`appointment-line appointment-line-${item.tone}`} />
                    <div>
                      <strong>{item.name}</strong>
                      <span>{item.service}</span>
                    </div>
                    <span className="appointment-duration">45 min</span>
                  </div>
                ))}
              </div>
            </section>
            <aside className="preview-insight">
              <div className="preview-section-title">
                <div>
                  <p>Booking flow</p>
                  <span>Last 7 days</span>
                </div>
              </div>
              <div className="mini-chart" aria-label="Illustrative upward booking chart">
                {[38, 48, 42, 64, 58, 76, 88].map((height, index) => (
                  <span key={index} style={{ height: `${height}%` }} />
                ))}
              </div>
              <div className="insight-note">
                <span className="insight-icon">↗</span>
                <p><strong>Steady momentum</strong><br />More clients are booking online.</p>
              </div>
            </aside>
          </div>
        </div>
      </div>
      <p className="sr-only">
        Static product concept showing an owner dashboard with booking metrics,
        a daily schedule, and an illustrative trend chart.
      </p>
    </div>
  );
}

