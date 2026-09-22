from src.orders import create_order


def test_create_order():
    r = create_order("sku1", 2)
    assert r["status"] == "created"
