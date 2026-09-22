"""Orders: creates an order line. No coverage tool wired up in this fixture yet."""


def create_order(sku: str, qty: int) -> dict:
    if qty <= 0:
        raise ValueError("invalid quantity")
    return {"sku": sku, "qty": qty, "status": "created"}
