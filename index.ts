import { DateTime } from "luxon";
import "./windowSize.js";
export * from "./hooks/debounce";
export * from "./hooks/tracker";

type TrackerEvent = {
  timestamp: number;
  dimensions?: {
    route?: string;
    resolution?: {
      width: number;
      height: number;
    };
    tag?: string;
    event?: string;
    meta?: Record<string, any>;
    [key: string]: any;
  };
};

type AnalyticsOptions = {
  afk?: number;
};
class Analytics {
  readonly API_URL = "http://localhost:3000";

  private applicationId: string | undefined;
  private visitorId: string | undefined | null;
  private sessionId: string | undefined;
  private labelService: string | undefined;
  private afk: number = 300;

  private resolutions: { width: number; height: number } = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  constructor() {}

  getApplicationId() {
    if (!this.applicationId) {
      throw new Error("ApplicationId is not defined");
    }
    return this.applicationId;
  }

  getResolutions(): { width: number; height: number } {
    return this.resolutions;
  }

  getSessionId() {
    return this.sessionId;
  }

  register(
    applicationId: string,
    labelService: string,
    opt?: AnalyticsOptions
  ): void {
    if (!applicationId) {
      throw new Error("ApplicationId is required");
    }
    if (!labelService) {
      throw new Error("LabelService is required");
    }

    this.visitorId = localStorage.getItem("analytics-visitorid");
    if (!this.visitorId) {
      const visitorId = crypto.randomUUID();
      localStorage.setItem("visitor-id", visitorId);
      this.visitorId = visitorId;
    }

    this.applicationId = applicationId;
    this.labelService = labelService;
    if (opt?.afk) {
      this.afk = opt.afk;
    }
    this.handleActiveUser();
    const sessionId = localStorage.getItem("analytics-sessionid");
    if (sessionId) {
      this.sessionId = sessionId;
    }
    this._handleResizeResolutions();
  }

  handleActiveUser() {
    const fiveMinutesFromNow = DateTime.now()
      .plus({ seconds: this.afk })
      .toJSDate()
      .getTime();
    const sessionExpiration =
      localStorage.getItem("analytics-session-expiration") ?? 0;

    const sessionExpirationDate = DateTime.fromMillis(
      Number(sessionExpiration)
    );
    if (sessionExpirationDate < DateTime.now()) {
      localStorage.setItem("analytics-sessionid", crypto.randomUUID());
      const sessionId = localStorage.getItem("analytics-sessionid");
      if (sessionId) {
        this.sessionId = sessionId;
      }
    }

    localStorage.setItem(
      "analytics-session-expiration",
      `${fiveMinutesFromNow}`
    );
  }

  sendAnalyticsEvent(events: TrackerEvent[]) {
    const mappedEvents = events.map((event) => ({
      ...event,
      applicationId: this.applicationId,
      sessionId: this.sessionId,
      visitorId: this.visitorId,
      labelService: this.labelService,
    }));
    return fetch(`${this.API_URL}/tracker-event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-application-id": this.applicationId ?? "",
      },
      body: JSON.stringify(mappedEvents),
    });
  }

  private _handleResizeResolutions() {
    window.addEventListener("resize", () => {
      this.resolutions = {
        width: window.innerWidth,
        height: window.innerHeight,
      };
    });
  }
}

const ESGIAnalytics = new Analytics();

export default ESGIAnalytics;
