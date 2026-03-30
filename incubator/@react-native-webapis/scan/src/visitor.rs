use crate::web_api_visitor::WebApiVisitor;
use std::collections::HashMap;
use std::path::Path;
use swc_common::{self, sync::Lrc, SourceFile, SourceMap};
use swc_ecma_parser::{error::Error, parse_file_as_module, EsConfig, Syntax, TsConfig};
use swc_ecma_visit::VisitWith;
use swc_ecmascript::ast::{EsVersion, Module};

trait ParseableModule {
    fn parse_file_as_module(&self, source_path: &Path) -> Result<Module, Error>;
}

impl ParseableModule for SourceFile {
    fn parse_file_as_module(&self, source_path: &Path) -> Result<Module, Error> {
        let extension = source_path.extension().expect("Expected a file extension");
        parse_file_as_module(
            self,
            if extension == "ts" || extension == "tsx" {
                Syntax::Typescript(TsConfig {
                    tsx: extension == "tsx",
                    decorators: true,
                    ..Default::default()
                })
            } else {
                Syntax::Es(EsConfig {
                    jsx: true,
                    decorators: true,
                    ..Default::default()
                })
            },
            EsVersion::latest(),
            None,
            &mut vec![],
        )
    }
}

pub fn visit(source_path: &Path) -> HashMap<String, i32> {
    let mut usage_map = HashMap::new();

    let cm: Lrc<SourceMap> = Default::default();
    let fm = match cm.load_file(source_path) {
        Ok(fm) => fm,
        Err(..) => {
            eprintln!("Failed to load source file: {}", source_path.display());
            return usage_map;
        }
    };

    match fm.parse_file_as_module(&source_path) {
        Ok(module) => module.visit_with(&mut WebApiVisitor {
            usage_map: &mut usage_map,
        }),
        Err(..) => {
            eprintln!("Failed to parse source file: {}", source_path.display());
        }
    }

    usage_map
}
