# mypy: ignore-errors
from unittest.mock import MagicMock, patch

from dependencies.auth import CurrentUser
from services import observability


def test_set_sentry_user_with_current_user_does_not_raise():
    user = CurrentUser(id="00000000-0000-0000-0000-000000000001", email="test@test.com")
    with patch.object(observability, "is_sentry_enabled", return_value=True):
        mock_sdk = MagicMock()
        with patch.object(observability, "sentry_sdk", mock_sdk):
            observability.set_sentry_user(user)
            mock_sdk.set_user.assert_called_once()
            arg = mock_sdk.set_user.call_args[0][0]
            assert isinstance(arg, dict)
            assert arg["id"] == user.id
