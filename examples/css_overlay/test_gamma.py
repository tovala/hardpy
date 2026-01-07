import time
from hardpy import set_message

def test_gamma_protocol():
    set_message("Gamma protocol starting", "status")
    time.sleep(2)
    set_message("Executing gamma steps", "status")
    time.sleep(2)
    set_message("Gamma protocol finished", "status")
    assert True

def test_gamma_calibration():
    set_message("Calibrating gamma system", "status")
    time.sleep(2)
    set_message("Gamma calibration done", "status")
    assert True
