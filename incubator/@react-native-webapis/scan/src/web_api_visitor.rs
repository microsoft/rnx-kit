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
            .entry(sym)
            .and_modify(|count| *count += 1)
            .or_insert(1);
    }

    pub fn insert_navigator_member(&mut self, sym: &str) {
        self.insert(format!("navigator.{}", sym));
    }
}

impl<'a> Visit for WebApiVisitor<'a> {
    fn visit_member_expr(&mut self, member: &MemberExpr) {
        if let Expr::Ident(ident) = member.obj.as_ref() {
            if ident.as_ref() == "navigator" {
                match &member.prop {
                    MemberProp::Ident(prop) => self.insert_navigator_member(prop.as_ref()),
                    MemberProp::Computed(ComputedPropName { expr, .. }) => {
                        if let Expr::Lit(Lit::Str(Str { value, .. })) = expr.as_ref() {
                            self.insert_navigator_member(&value);
                        } else {
                            expr.visit_with(self);
                        }
                    }
                    _ => {}
                }
            }
        }
    }

    fn visit_new_expr(&mut self, expr: &NewExpr) {
        if let Expr::Ident(ident) = expr.callee.as_ref() {
            if let Ok(..) = WEB_APIS.binary_search(&ident.as_ref()) {
                self.insert(ident.as_ref().to_string());
            }
        }
    }
}
