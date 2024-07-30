import { LitElement, html, css } from "lit";
import { property, customElement } from "lit/decorators.js";

import { getEntityTemperature } from "../../../helpers";
import { HassEntity, TemperatureUnit } from "../../../types";

import "./stat_line.ts";

@customElement("anycubic-printercard-stat-temperature")
export class AnycubicPrintercardStatTemperature extends LitElement {
  @property({ type: String })
  public name: string;

  @property()
  public temperatureEntity: HassEntity;

  @property({ type: Boolean })
  public round?: boolean;

  @property({ type: String })
  public temperatureUnit: TemperatureUnit;

  render() {
    return html`<anycubic-printercard-stat-line
      .name=${this.name}
      .value=${getEntityTemperature(
        this.temperatureEntity,
        this.temperatureUnit,
        this.round,
      )}
    ></anycubic-printercard-stat-line>`;
  }

  static get styles() {
    return css`
      :host {
        box-sizing: border-box;
        width: 100%;
      }
    `;
  }
}
