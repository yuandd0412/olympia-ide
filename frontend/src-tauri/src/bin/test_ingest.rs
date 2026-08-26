#[tokio::main]
async fn main() {
    match app_lib::ingest::fetch_luogu_problem("P1005".to_string()).await {
        Ok(p) => {
            println!("Success: {}", p.title);
            println!("Time limit: {} ms", p.time_limit_ms);
            println!("Memory limit: {} kb", p.memory_limit_kb);
            println!("Samples: {}", p.samples.len());
            println!("Desc len: {}", p.description_md.len());
        },
        Err(e) => println!("Error: {}", e),
    }
}
