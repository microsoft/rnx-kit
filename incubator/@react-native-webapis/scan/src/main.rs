use crate::ignored_dirs::IGNORED_DIRECTORIES;
use rayon::prelude::*;
use std::collections::HashMap;
use visitor::visit;
use walkdir::{DirEntry, WalkDir};

mod ignored_dirs;
mod visitor;
mod web_api_visitor;
mod web_apis;

fn print_sorted(map: &HashMap<String, i32>) {
    let mut entries = map.iter().collect::<Vec<(&String, &i32)>>();
    entries.sort_unstable_by(|lhs, rhs| (*lhs.1).cmp(rhs.1).reverse());

    println!("{{");
    for (k, v) in entries.iter() {
        println!("\t\"{}\": {},", k, v);
    }
    println!("}}");
}

fn is_source_file(entry: &DirEntry, extensions: &[&str], ignored_extensions: &[&str]) -> bool {
    match entry.file_type().is_file() {
        true => {
            let filename = entry.file_name().to_string_lossy();
            let is_ignored = ignored_extensions
                .iter()
                .any(|&ext| filename.ends_with(ext));
            !is_ignored && extensions.iter().any(|&ext| filename.ends_with(ext))
        }
        false => {
            let filename = entry.file_name().to_string_lossy();
            if let Ok(..) = IGNORED_DIRECTORIES.binary_search(&filename.as_ref()) {
                false
            } else {
                true
            }
        }
    }
}

fn main() {
    let extensions = &[".js", ".jsx", ".ts", ".tsx"];
    let ignored_extensions = &[".d.ts"];

    let result = WalkDir::new(".")
        .into_iter()
        .filter_entry(|entry| is_source_file(entry, extensions, ignored_extensions))
        .filter_map(Result::ok)
        .collect::<Vec<DirEntry>>()
        .par_iter()
        .filter(|entry| entry.file_type().is_file())
        .map(|entry| visit(entry.path()))
        .reduce_with(|mut result, segment| {
            for (k, v) in segment {
                result.entry(k).and_modify(|count| *count += v).or_insert(v);
            }
            result
        });

    match result {
        Some(data) => print_sorted(&data),
        None => println!("{{}}"),
    }
}
