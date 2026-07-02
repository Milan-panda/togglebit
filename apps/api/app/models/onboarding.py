from pydantic import BaseModel


class OnboardingSteps(BaseModel):
    create_flag: bool
    dev_api_key: bool
    sdk_connected: bool
    test_eval: bool


class OnboardingStatusResponse(BaseModel):
    complete: bool
    first_flag_key: str | None
    steps: OnboardingSteps
