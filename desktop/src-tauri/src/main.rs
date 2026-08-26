#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    nse_market_hub_lib::run();
}
