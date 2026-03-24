import pytest


@pytest.fixture
def hardpy_opts_repeat(hardpy_opts: list[str]):
    # The restart should check the uncleaned database
    assert "--hardpy-clear-database" not in hardpy_opts[1:]
    return hardpy_opts[1:]
