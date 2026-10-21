"""The platform's standard currency.

US$ is used throughout Axis: subscribing, listing a property, recording a
tenant's payment, the reports generated and what a tenant sees on their
dashboard. Property, unit, lease and profile currencies are forced to USD by
the models, and every stored amount has been converted to USD.

This constant is what is assumed when a record carries no currency of its
own, so that a missing value can never be silently read as shillings.
"""

DEFAULT_CURRENCY = "USD"

#: Currencies Axis can actually take money in. Ugandan mobile money cannot
#: settle dollars, which is why UGX remains a payment option for
#: subscriptions and boosts even though they are priced in US$.
PAYMENT_CURRENCIES = ("USD", "UGX")
