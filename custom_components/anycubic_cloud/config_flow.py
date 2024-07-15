"""Adds config flow for Anycubic Cloud integration."""
from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from aiohttp import CookieJar
import voluptuous as vol

from homeassistant.config_entries import ConfigEntry, ConfigFlow, OptionsFlow
from homeassistant.const import CONF_PASSWORD, CONF_USERNAME
from homeassistant.core import callback
from homeassistant.data_entry_flow import FlowResult
from homeassistant.helpers.aiohttp_client import async_create_clientsession
import homeassistant.helpers.config_validation as cv

from .anycubic_api import AnycubicAPI

from .const import (
    CONF_DEBUG,
    CONF_DRYING_PRESET_DURATION_,
    CONF_DRYING_PRESET_TEMPERATURE_,
    CONF_MQTT_CONNECT_MODE,
    CONF_PRINTER_ID_LIST,
    DOMAIN,
    LOGGER,
    MAX_DRYING_PRESETS,
)

from .helpers import (
    AnycubicMQTTConnectMode,
)

DATA_SCHEMA = vol.Schema(
    {
        vol.Required(CONF_USERNAME): cv.string,
        vol.Required(CONF_PASSWORD): cv.string,
    }
)

DATA_SCHEMA_AUTH = vol.Schema(
    {
        vol.Required(CONF_USERNAME): cv.string,
        vol.Required(CONF_PASSWORD): cv.string,
    }
)

MQTT_CONNECT_MODES = {
    AnycubicMQTTConnectMode.Printing_Only: "Printing Only",
    AnycubicMQTTConnectMode.Printing_Drying: "Printing & Drying",
    AnycubicMQTTConnectMode.Device_Online: "Device Online",
    AnycubicMQTTConnectMode.Always: "Always",
}


class AnycubicCloudConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle a config flow for AnycubicCloud integration."""

    VERSION = 1

    entry: ConfigEntry | None

    def __init__(self) -> None:
        """Initialize."""
        self._password: str | None = None
        self._username: str | None = None

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> AnycubicCloudOptionsFlowHandler:
        """Get the options flow for this handler."""
        return AnycubicCloudOptionsFlowHandler(config_entry)

    async def async_step_reauth(self, entry_data: Mapping[str, Any]) -> FlowResult:
        """Handle initiation of re-authentication with AnycubicCloud."""
        self.entry = self.hass.config_entries.async_get_entry(self.context["entry_id"])
        return await self.async_step_reauth_confirm()

    async def async_step_reauth_confirm(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Dialog that informs the user that reauth is required."""
        errors = {}

        if user_input is not None:
            cookie_jar = CookieJar(unsafe=True)
            websession = async_create_clientsession(
                self.hass,
                cookie_jar=cookie_jar,
            )

            self._username = user_input[CONF_USERNAME]
            self._password = user_input[CONF_PASSWORD]

            try:
                ac = AnycubicAPI(
                    api_username=self._username,
                    api_password=self._password,
                    session=websession,
                    cookie_jar=cookie_jar,
                    debug_logger=LOGGER.debug,
                )
                success = await ac.check_api_tokens()
                if not success:
                    LOGGER.error("Authentication failed. Check credentials.")
                    errors = {"base": "invalid_auth"}

            except Exception as error:
                LOGGER.error("Authentication failed with unknown Error. Check credentials %s", error)
                errors = {"base": "cannot_connect"}

            if not errors:
                if self.entry:
                    self.hass.config_entries.async_update_entry(
                        self.entry,
                        data={
                            **self.entry.data,
                            CONF_USERNAME: self._username,
                            CONF_PASSWORD: self._password,
                        },
                    )
                    return await self.async_step_printer()

        return self.async_show_form(
            step_id="reauth_confirm",
            data_schema=DATA_SCHEMA_AUTH,
            errors=errors,
        )

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Handle the initial step."""
        errors = {}

        if user_input is not None:
            cookie_jar = CookieJar(unsafe=True)
            websession = async_create_clientsession(
                self.hass,
                cookie_jar=cookie_jar,
            )

            self._username = user_input[CONF_USERNAME]
            self._password = user_input[CONF_PASSWORD]

            try:
                ac = AnycubicAPI(
                    api_username=self._username,
                    api_password=self._password,
                    session=websession,
                    cookie_jar=cookie_jar,
                    debug_logger=LOGGER.debug,
                )
                success = await ac.check_api_tokens()
                if not success:
                    LOGGER.error("Authentication failed. Check credentials.")
                    errors = {"base": "invalid_auth"}

            except Exception as error:
                LOGGER.error("Authentication failed with unknown Error. Check credentials %s", error)
                errors = {"base": "cannot_connect"}

            if not errors:
                return await self.async_step_printer()

        return self.async_show_form(
            step_id="user",
            data_schema=DATA_SCHEMA,
            errors=errors,
        )

    async def async_step_printer(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Handle the printer step."""
        errors = {}

        cookie_jar = CookieJar(unsafe=True)
        websession = async_create_clientsession(
            self.hass,
            cookie_jar=cookie_jar,
        )

        try:
            if self._username is None or self._password is None:
                self.entry = self.hass.config_entries.async_get_entry(self.context["entry_id"])
                self._username = self.entry.data[CONF_USERNAME]
                self._password = self.entry.data[CONF_PASSWORD]

            ac = AnycubicAPI(
                api_username=self._username,
                api_password=self._password,
                session=websession,
                cookie_jar=cookie_jar,
                debug_logger=LOGGER.debug,
            )
            success = await ac.check_api_tokens()
            if not success:
                LOGGER.error("Authentication failed. Check credentials.")
                errors = {"base": "invalid_auth"}

            printer_list = await ac.list_my_printers()

            if printer_list is None or len(printer_list) < 1:
                LOGGER.error("No printers found. Check config.")
                errors = {"base": "invalid_printer"}

            printer_id_map = {f"{x.id}": x.name for x in printer_list}

        except Exception as error:
            LOGGER.error("Authentication failed with unknown Error. Check credentials %s", error)
            errors = {"base": "cannot_connect"}

        if user_input and not errors:
            printer_id_list = list([int(x) for x in user_input[CONF_PRINTER_ID_LIST]])

            for printer_id in printer_id_list:
                try:
                    printer_status = await ac.printer_info_for_id(printer_id)

                    if printer_status is None:
                        LOGGER.error("Printer not found. Check config.")
                        errors = {"base": "invalid_printer"}
                        break

                except Exception as error:
                    LOGGER.error("Authentication failed with unknown Error. Check credentials %s", error)
                    errors = {"base": "cannot_connect"}
                    break

            if not errors:
                existing_entry = await self.async_set_unique_id(f"{self._username}")
                if existing_entry and self.entry:
                    self.hass.config_entries.async_update_entry(
                        existing_entry,
                        data={
                            **self.entry.data,
                            CONF_USERNAME: self._username,
                            CONF_PASSWORD: self._password,
                            CONF_PRINTER_ID_LIST: printer_id_list,
                        },
                    )
                    await self.hass.config_entries.async_reload(existing_entry.entry_id)
                    return self.async_abort(reason="reauth_successful")
                else:
                    return self.async_create_entry(
                        title=self._username,
                        data={
                            CONF_USERNAME: self._username,
                            CONF_PASSWORD: self._password,
                            CONF_PRINTER_ID_LIST: printer_id_list,
                        },
                    )

        return self.async_show_form(
            step_id="printer",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_PRINTER_ID_LIST): cv.multi_select(printer_id_map),
                },
            ),
        )


class AnycubicCloudOptionsFlowHandler(OptionsFlow):
    """Handle Anycubic Cloud options."""

    def __init__(self, entry: ConfigEntry) -> None:
        """Initialize Anycubic Cloud options flow."""
        self.entry = entry

    def _build_options_schema(self):
        schema = dict()
        for x in range(MAX_DRYING_PRESETS):
            num = x + 1

            dur_key = f"{CONF_DRYING_PRESET_DURATION_}{num}"
            schema[vol.Optional(
                dur_key,
                default=self.entry.options.get(dur_key)
            )] = cv.positive_int

            temp_key = f"{CONF_DRYING_PRESET_TEMPERATURE_}{num}"
            schema[vol.Optional(
                temp_key,
                default=self.entry.options.get(temp_key)
            )] = cv.positive_int

        schema[vol.Optional(
            CONF_MQTT_CONNECT_MODE,
            default=self.entry.options.get(CONF_MQTT_CONNECT_MODE)
        )] = vol.In(MQTT_CONNECT_MODES)

        schema[vol.Optional(
            CONF_DEBUG,
            default=self.entry.options.get(CONF_DEBUG, False)
        )] = cv.boolean

        return vol.Schema(schema)

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Manage Anycubic Cloud options."""
        errors: dict[str, Any] = {}

        if user_input:
            return self.async_create_entry(data=user_input)

        return self.async_show_form(
            step_id="init",
            data_schema=self._build_options_schema(),
            errors=errors,
        )
