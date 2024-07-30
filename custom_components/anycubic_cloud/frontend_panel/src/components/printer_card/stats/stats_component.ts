import { LitElement, html, css, PropertyValues } from "lit";
import { property, customElement, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";

import { getPrinterSensorStateObj, toTitleCase } from "../../../helpers";
import {
  HassEntityInfos,
  HassPanel,
  HassRoute,
  HomeAssistant,
  PrinterCardStatType,
  TemperatureUnit,
} from "../../../types";

import "./stat_line.ts";
import "./temperature_stat.ts";
import "./time_stat.ts";

@customElement("anycubic-printercard-stats-component")
export class AnycubicPrintercardStatsComponent extends LitElement {
  @property()
  public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true })
  public narrow!: boolean;

  @property()
  public route!: HassRoute;

  @property()
  public panel!: HassPanel;

  @property()
  public monitoredStats: PrinterCardStatType[];

  @property({ type: Boolean })
  public showPercent?: boolean;

  @property({ type: Boolean })
  public round?: boolean = true;

  @property({ type: Boolean })
  public use_24hr?: boolean;

  @property({ type: String })
  public temperatureUnit: TemperatureUnit = TemperatureUnit.C;

  @property()
  public printerEntities: HassEntityInfos;

  @property()
  public printerEntityIdPart: string | undefined;

  @state()
  private _progressPercent: number = 0;

  protected willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);

    if (
      changedProperties.has("hass") ||
      changedProperties.has("printerEntities") ||
      changedProperties.has("printerEntityIdPart")
    ) {
      this._progressPercent = this.percentComplete();
    }
  }

  render() {
    return html`
      <div class="ac-stats-component">
        ${this.showPercent
          ? html`
              <div class="ac-stats-part-percent">
                <p class="ac-stats-part-percent-text">
                  ${this.round
                    ? Math.round(this._progressPercent)
                    : this._progressPercent}%
                </p>
              </div>
            `
          : null}
        <div class="ac-stats-part-monitored">${this.renderStats()}</div>
      </div>
    `;
  }

  percentComplete(): number {
    return getPrinterSensorStateObj(
      this.hass,
      this.printerEntities,
      this.printerEntityIdPart,
      "project_progress",
      -1.0,
    ).state;
  }

  renderStats(): HTMLElement {
    return repeat(
      this.monitoredStats,
      (condition) => condition,
      (condition, _index) => {
        switch (condition) {
          case PrinterCardStatType.Status:
            return html`
              <anycubic-printercard-stat-line
                .name=${condition}
                .value=${toTitleCase(
                  getPrinterSensorStateObj(
                    this.hass,
                    this.printerEntities,
                    this.printerEntityIdPart,
                    "print_state",
                  ).state,
                )}
              ></anycubic-printercard-stat-line>
            `;
          case PrinterCardStatType.ETA:
            return html`
              <anycubic-printercard-stat-time
                .timeEntity=${getPrinterSensorStateObj(
                  this.hass,
                  this.printerEntities,
                  this.printerEntityIdPart,
                  "project_time_remaining",
                )}
                .timeType=${condition}
                .direction=${0}
                .round=${this.round}
                .use_24hr=${this.use_24hr}
              ></anycubic-printercard-stat-time>
            `;
          case PrinterCardStatType.Elapsed:
            return html`
              <anycubic-printercard-stat-time
                .timeEntity=${getPrinterSensorStateObj(
                  this.hass,
                  this.printerEntities,
                  this.printerEntityIdPart,
                  "project_time_elapsed",
                )}
                .timeType=${condition}
                .direction=${1}
                .round=${this.round}
                .use_24hr=${this.use_24hr}
              ></anycubic-printercard-stat-time>
            `;

          case PrinterCardStatType.Remaining:
            return html`
              <anycubic-printercard-stat-time
                .timeEntity=${getPrinterSensorStateObj(
                  this.hass,
                  this.printerEntities,
                  this.printerEntityIdPart,
                  "project_time_remaining",
                )}
                .timeType=${condition}
                .direction=${-1}
                .round=${this.round}
                .use_24hr=${this.use_24hr}
              ></anycubic-printercard-stat-time>
            `;

          case PrinterCardStatType.BedCurrent:
            return html`
              <anycubic-printercard-stat-temperature
                .name=${condition}
                .temperatureEntity=${getPrinterSensorStateObj(
                  this.hass,
                  this.printerEntities,
                  this.printerEntityIdPart,
                  "hotbed_temperature",
                )}
                .round=${this.round}
                .temperatureUnit=${this.temperatureUnit}
              ></anycubic-printercard-stat-temperature>
            `;

          case PrinterCardStatType.HotendCurrent:
            return html`
              <anycubic-printercard-stat-temperature
                .name=${condition}
                .temperatureEntity=${getPrinterSensorStateObj(
                  this.hass,
                  this.printerEntities,
                  this.printerEntityIdPart,
                  "nozzle_temperature",
                )}
                .round=${this.round}
                .temperatureUnit=${this.temperatureUnit}
              ></anycubic-printercard-stat-temperature>
            `;

          case PrinterCardStatType.BedTarget:
            return html`
              <anycubic-printercard-stat-temperature
                .name=${condition}
                .temperatureEntity=${getPrinterSensorStateObj(
                  this.hass,
                  this.printerEntities,
                  this.printerEntityIdPart,
                  "target_hotbed_temperature",
                )}
                .round=${this.round}
                .temperatureUnit=${this.temperatureUnit}
              ></anycubic-printercard-stat-temperature>
            `;

          case PrinterCardStatType.HotendTarget:
            return html`
              <anycubic-printercard-stat-temperature
                .name=${condition}
                .temperatureEntity=${getPrinterSensorStateObj(
                  this.hass,
                  this.printerEntities,
                  this.printerEntityIdPart,
                  "target_nozzle_temperature",
                )}
                .round=${this.round}
                .temperatureUnit=${this.temperatureUnit}
              ></anycubic-printercard-stat-temperature>
            `;

          default:
            return html`
              <anycubic-printercard-stat-line
                .name=${"Unknown"}
                .value=${"<unknown>"}
              ></anycubic-printercard-stat-line>
            `;
        }
      },
    );
  }

  static get styles() {
    return css`
      :host {
        box-sizing: border-box;
        width: 100%;
      }

      .ac-stats-component {
        box-sizing: border-box;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
      }

      .ac-stats-part-percent {
        box-sizing: border-box;
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        margin-bottom: 20px;
      }
      .ac-stats-part-percent-text {
        margin: 0px;
        font-size: 42px;
        font-weight: bold;
        height: 44px;
        line-height: 44px;
      }

      .ac-stats-part-monitored {
        box-sizing: border-box;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
      }
    `;
  }
}
