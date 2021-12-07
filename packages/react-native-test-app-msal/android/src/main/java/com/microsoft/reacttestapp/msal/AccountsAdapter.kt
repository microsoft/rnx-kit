package com.microsoft.reacttestapp.msal

import android.content.Context
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.TextView

class AccountsAdapter(
    context: Context,
    private val accounts: MutableList<Account>
) : ArrayAdapter<Account>(context, R.layout.account_item, accounts) {
    override fun getView(position: Int, convertView: View?, parent: ViewGroup): View {
        val layoutInflater = LayoutInflater.from(parent.context)
        val view = convertView ?: layoutInflater.inflate(R.layout.account_item, parent, false)

        val (userPrincipalName, accountType) = accounts[position]
        view.findViewById<TextView>(R.id.username).text = userPrincipalName

        val accountTypeText = parent.context.resources.getString(R.string.account_type)
        view.findViewById<TextView>(R.id.account_type).text =
            String.format(accountTypeText, accountType.description())

        return view
    }

    override fun getDropDownView(position: Int, convertView: View?, parent: ViewGroup): View {
        return getView(position, convertView, parent)
    }
}
