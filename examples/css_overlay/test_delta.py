import time
from hardpy import set_message

def test_delta_measurement():
    set_message("Delta measurement begin", "status")
    time.sleep(2)
    set_message("Analyzing delta values", "status")
    time.sleep(2)
    set_message("Delta measurement complete", "status")
    assert True

def test_delta_sync():
    set_message("Synchronizing delta", "status")
    time.sleep(2)
    set_message("Delta sync successful", "status")
    assert True
