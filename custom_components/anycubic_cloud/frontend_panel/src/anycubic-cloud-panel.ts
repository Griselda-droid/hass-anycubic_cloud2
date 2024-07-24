import { LitElement, html, css } from "lit";
import { property, customElement } from "lit/decorators.js";

import "./views/debug/view-debug.ts";
import "./views/main/view-main.ts";
import "./views/files/view-files_cloud.ts";
import "./views/files/view-files_local.ts";
import "./views/files/view-files_udisk.ts";

import { localize } from "../localize/localize";

import { DEBUG, VERSION } from "./const";
import {
  getPage,
  getPrinterDevID,
  getPrinterDevices,
  navigateToPage,
  navigateToPrinter,
} from "./helpers";
import { HomeAssistant, HassDeviceList, HassPanel, HassRoute } from "./types";

@customElement("anycubic-cloud-panel")
export class AnycubicCloudPanel extends LitElement {
  @property()
  public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true })
  public narrow!: boolean;

  @property()
  public route!: HassRoute;

  @property()
  public panel!: HassPanel;

  @property()
  printers?: HassDeviceList;

  async firstUpdated() {
    window.addEventListener("location-changed", () => {
      if (!window.location.pathname.includes("anycubic-cloud")) return;
      this.requestUpdate();
    });

    this.printers = await getPrinterDevices(this.hass);
    this.requestUpdate();
  }

  render() {
    return this.getInitialView();
  }

  renderPrinterPage() {
    const selectedPage = getPage(this.route);

    return html`
      <div class="header">
        ${this.renderToolbar()}
        <ha-tabs
          scrollable
          attr-for-selected="page-name"
          .selected=${selectedPage}
          @iron-activate=${this.handlePageSelected}
        >
          <paper-tab page-name="main">
            ${localize("panels.main.title", this.hass.language)}
          </paper-tab>
          <paper-tab page-name="local-files">
            ${localize("panels.files_local.title", this.hass.language)}
          </paper-tab>
          <paper-tab page-name="udisk-files">
            ${localize("panels.files_udisk.title", this.hass.language)}
          </paper-tab>
          <paper-tab page-name="cloud-files">
            ${localize("panels.files_cloud.title", this.hass.language)}
          </paper-tab>
          ${DEBUG
            ? html`
                <paper-tab page-name="debug">
                  ${localize("panels.debug.title", this.hass.language)}
                </paper-tab>
              `
            : null}
        </ha-tabs>
      </div>
      <div class="view">${this.getView(this.route)}</div>
    `;
  }

  renderToolbar() {
    return html`
      <div class="toolbar">
        <ha-menu-button
          .hass=${this.hass}
          .narrow=${this.narrow}
        ></ha-menu-button>
        <div class="main-title">${localize("title", this.hass.language)}</div>
        <div class="version">v${VERSION}</div>
      </div>
    `;
  }

  getInitialView() {
    const selectedPrinterID = getPrinterDevID(this.route);

    if (selectedPrinterID) {
      return this.renderPrinterPage();
    } else {
      return html`
        <div class="header">${this.renderToolbar()}</div>
        <printer-select elevation="2">
          <p>
            ${localize(
              "panels.initial.fields.printer_select.heading",
              this.hass.language,
            )}
          </p>
          <ul class="printers-container">
            ${this.printers
              ? Object.keys(this.printers).map(
                  (printerID) =>
                    html`<li
                      class="printer-select-box"
                      @click="${(_e) => {
                        this._handlePrinterClick(printerID);
                      }}"
                    >
                      ${this.printers[printerID].name}
                    </li>`,
                )
              : null}
          </ul>
        </printer-select>
      `;
    }
  }

  getView(route: HassRoute) {
    const selectedPage = getPage(route);

    switch (selectedPage) {
      case "local-files":
        return html`
          <anycubic-view-files_local
            .hass=${this.hass}
            .narrow=${this.narrow}
            .route=${route}
            .panel=${this.panel}
            .printers=${this.printers}
          ></anycubic-view-files_local>
        `;
      case "udisk-files":
        return html`
          <anycubic-view-files_udisk
            .hass=${this.hass}
            .narrow=${this.narrow}
            .route=${route}
            .panel=${this.panel}
            .printers=${this.printers}
          ></anycubic-view-files_udisk>
        `;
      case "cloud-files":
        return html`
          <anycubic-view-files_cloud
            .hass=${this.hass}
            .narrow=${this.narrow}
            .route=${route}
            .panel=${this.panel}
            .printers=${this.printers}
          ></anycubic-view-files_cloud>
        `;
      case "main":
        return html`
          <anycubic-view-main
            .hass=${this.hass}
            .narrow=${this.narrow}
            .route=${route}
            .panel=${this.panel}
            .printers=${this.printers}
          ></anycubic-view-main>
        `;
      case "debug":
        return html`
          <anycubic-view-debug
            .hass=${this.hass}
            .narrow=${this.narrow}
            .route=${route}
            .panel=${this.panel}
            .printers=${this.printers}
          ></anycubic-view-debug>
        `;
      default:
        return html`
          <ha-card header="Page not found">
            <div class="card-content">
              The page you are trying to reach cannot be found. Please select a
              page from the menu above to continue.
            </div>
          </ha-card>
        `;
    }
  }

  _handlePrinterClick(printer_id) {
    navigateToPrinter(this, printer_id);
    this.requestUpdate();
  }

  handlePageSelected(ev) {
    const newPage = ev.detail.item.getAttribute("page-name");
    if (newPage !== getPage(this.route)) {
      navigateToPage(this, newPage);
      this.requestUpdate();
    } else {
      scrollTo(0, 0);
    }
  }

  static get styles() {
    return css`
      :host {
        padding: 16px;
        display: block;
      }
      .header {
        background-color: var(--app-header-background-color);
        color: var(--app-header-text-color, white);
        border-bottom: var(--app-header-border-bottom, none);
      }
      .toolbar {
        height: var(--header-height);
        display: flex;
        align-items: center;
        font-size: 20px;
        padding: 0 16px;
        font-weight: 400;
        box-sizing: border-box;
      }
      .main-title {
        margin: 0 0 0 24px;
        line-height: 20px;
        flex-grow: 1;
      }
      ha-tabs {
        margin-left: max(env(safe-area-inset-left), 24px);
        margin-right: max(env(safe-area-inset-right), 24px);
        --paper-tabs-selection-bar-color: var(
          --app-header-selection-bar-color,
          var(--app-header-text-color, #fff)
        );
        text-transform: uppercase;
      }

      .version {
        font-size: 14px;
        font-weight: 500;
        color: rgba(var(--rgb-text-primary-color), 0.9);
      }

      printer-select {
        padding: 16px;
        display: block;
        font-size: 18px;
        max-width: 1024px;
        margin: 0 auto;
      }

      .view {
        height: calc(100vh - 112px);
        display: flex;
        justify-content: center;
      }

      .view > * {
        width: 600px;
        max-width: 1024px;
      }

      .view > *:last-child {
        margin-bottom: 20px;
      }

      .printers-container {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
      }

      .printer-select-box {
        cursor: pointer;
        display: block;
        min-height: 60px;
        min-width: 250px;
        border: 2px solid #ccc3;
        border-radius: 16px;
        padding: 16px;
        line-height: 60px;
        text-align: center;
        font-weight: 900;
      }

      .printer-select-box:hover {
        background-color: #ccc3;
        border-color: #ccc9;
      }
    `;
  }
}
