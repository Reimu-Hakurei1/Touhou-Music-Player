#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
};

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let open = MenuItem::with_id(app, "open", "Open player", true, None::<&str>)?;
            let play_pause = MenuItem::with_id(app, "play-pause", "Play / Pause", true, None::<&str>)?;
            let previous = MenuItem::with_id(app, "previous", "Previous song", true, None::<&str>)?;
            let next = MenuItem::with_id(app, "next", "Next song", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &play_pause, &previous, &next, &quit])?;

            let mut tray = TrayIconBuilder::new()
                .tooltip("Touhou Music Player")
                .menu(&menu)
                .on_menu_event(|app, event| {
                    if event.id() == "quit" {
                        app.exit(0);
                        return;
                    }

                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                        let selector = if event.id() == "play-pause" {
                            Some("#play")
                        } else if event.id() == "previous" {
                            Some("#prev")
                        } else if event.id() == "next" {
                            Some("#next")
                        } else {
                            None
                        };
                        if let Some(selector) = selector {
                            let _ = window.eval(&format!(
                                "document.querySelector('{}')?.click()",
                                selector
                            ));
                        }
                    }
                });

            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }
            tray.build(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("failed to start Touhou Music Player");
}
