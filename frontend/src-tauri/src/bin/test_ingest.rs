// Smoke bin: fetch a problem through the multi-OJ dispatcher.
//   cargo run --bin test_ingest [P1001 | 1900A | abc300_a | <full url>]
use std::env;

#[tokio::main]
async fn main() {
    let input = env::args().nth(1).unwrap_or_else(|| "P1001".to_string());
    println!("fetching: {input}");
    match app_lib::multi_oj::fetch_problem_auto(input).await {
        Ok(p) => {
            println!("Success: [{}] {} ({})", p.oj, p.id, p.title);
            println!("Difficulty: {} | Time: {} ms | Memory: {} kb", p.difficulty, p.time_limit_ms, p.memory_limit_kb);
            println!("Samples: {} | Desc len: {}", p.samples.len(), p.description_md.len());
            for s in p.samples.iter().take(1) {
                println!("Sample input head: {}", s.input.lines().next().unwrap_or(""));
            }
        }
        Err(e) => println!("Error: {e}"),
    }
}
