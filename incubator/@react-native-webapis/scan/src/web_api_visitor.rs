use crate::web_apis::WEB_APIS;
use std::collections::HashMap;
use swc_ecma_visit::{Visit, VisitWith};
use swc_ecmascript::ast::{ComputedPropName, Expr, Lit, MemberExpr, MemberProp, NewExpr, Str};

pub struct WebApiVisitor<'a> {
    pub usage_map: &'a mut HashMap<String, i32>,
}

impl<'a> WebApiVisitor<'a> {
    pub fn insert(&mut self, sym: String) {
        self.usage_map
            .entry(sym.replace("\"", ""))  // Sometimes, these include quotes
            .and_modify(|count| *count += 1)
            .or_insert(1);
    }

    pub fn insert_global_member(&mut self, global: &str, sym: &str) {
        self.insert(format!("{}.{}", global, sym));
    }
}

impl<'a> Visit for WebApiVisitor<'a> {
    /// Count all references to `navigator.*`
    fn visit_member_expr(&mut self, member: &MemberExpr) {
        if let Expr::Ident(ident) = member.obj.as_ref() {
            let id = ident.as_ref();
            if id == "document" || id == "navigator" || id == "window" {
                match &member.prop {
                    MemberProp::Ident(prop) => self.insert_global_member(&id, prop.as_ref()),
                    MemberProp::Computed(ComputedPropName { expr, .. }) => {
                        if let Expr::Lit(Lit::Str(Str { value, .. })) = expr.as_ref() {
                            self.insert_global_member(&id, &value);
                        } else {
                            expr.visit_with(self);
                        }
                    }
                    _ => {}
                }
            }
        }
    }

    /// Count all uses of identifiers that found in `WEB_APIS`
    fn visit_new_expr(&mut self, expr: &NewExpr) {
        if let Expr::Ident(ident) = expr.callee.as_ref() {
            if let Ok(..) = WEB_APIS.binary_search(&ident.as_ref()) {
                self.insert(ident.as_ref().to_string());
            }
        }
    }
}
