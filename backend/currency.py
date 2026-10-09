"""The platform's standard currency.

US$ is used throughout Axis: subscribing, listing a property, recording a
tenant's payment, the reports generated and what a tenant sees on their
dashboard.

A manager may still price a property in any currency from the picker, and
rows created before this changed keep the currency they were created with.
This constant is only what is assumed when a record carries no currency of
its own, so that a missing value can never be silently read as shillings.
"""

DEFAULT_CURRENCY = "USD"

#: Currencies Axis can actually take money in. Ugandan mobile money cannot
#: settle dollars, which is why UGX remains a payment option for
#: subscriptions and boosts even though they are priced in US$.
PAYMENT_CURRENCIES = ("USD", "UGX")
