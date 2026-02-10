use std::{net::TcpListener, str};
use axum::{extract::Query, response::Html, routing::get, Router};
use open;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct OAuthData {
    code: Option<String>,
}

#[tauri::command]
pub fn open_url_in_browser(url: String) -> Result<(), String> {
    open::that(&url).map_err(|e| format!("Failed to open URL in browser: {}", e))?;
    
    let ports = [3000, 8081, 8082, 8083, 8084];
    let mut main_port: Option<u16> = None;
    
    for &port in &ports {
        if is_port_available(port) {
            println!("Port {} is available", port);
            main_port = Some(port);
            break;
        } else {
            println!("Port {} is not available", port);
        }
    }
    
    if let Some(port) = main_port {

        std::thread::spawn(move || {
            start_http_server(port);
        });
    } else {
        return Err("No available ports found".to_string());
    }
    
    Ok(())
}

fn is_port_available(port: u16) -> bool {
    TcpListener::bind(("127.0.0.1", port)).is_ok()
}

fn start_http_server(port: u16) {
    // Create Tokio runtime manually since we're in a non-async context
    let rt = tokio::runtime::Runtime::new().unwrap();
    
    rt.block_on(async {
        let app = Router::new()
            .route("/", get(handle_request));

        let listener = tokio::net::TcpListener::bind(format!("127.0.0.1:{}", port))
            .await
            .unwrap();
        
        println!("Server listening on port: {}", listener.local_addr().unwrap());
        
        axum::serve(listener, app).await.unwrap();
    });
}


async fn handle_request(query: Query<OAuthData>) -> Html<String> {
    Html(format!(r#"<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"></head><body><script>window.location.href = "http://localhost:4200/api/auth/callback?code={}"</script></body></html>"#, query.code.as_deref().unwrap_or("none")).to_string())
}
