from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class InputModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CompanyCreate(InputModel):
    name: str = Field(min_length=1, max_length=160)


class ProductCreate(InputModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=4000)
    slug: str | None = Field(default=None, min_length=1, max_length=120, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


class ProductUpdate(InputModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=4000)
    slug: str | None = Field(default=None, min_length=1, max_length=120, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    is_published: bool | None = None


class ClaimCreate(InputModel):
    text: str = Field(min_length=1, max_length=2000)


class ClaimUpdate(InputModel):
    text: str = Field(min_length=1, max_length=2000)


class AssessmentStatus(StrEnum):
    supported = "supported"
    partially_supported = "partially_supported"
    unsubstantiated = "unsubstantiated"
    contradicted = "contradicted"
    needs_review = "needs_review"


class AssessmentRequest(InputModel):
    document_ids: list[UUID] = Field(min_length=1)
    claim_ids: list[UUID] = Field(min_length=1)


class Fact(InputModel):
    id: str = Field(min_length=1)
    document_id: UUID
    text: str
    value: float | None = None
    unit: str | None = None
    scope: str | None = None
    period: str | None = None
    page: int = Field(ge=1)
    quote: str


class Evidence(InputModel):
    fact_id: str
    page: int = Field(ge=1)
    quote: str


class AssessedClaim(InputModel):
    id: str
    text: str
    type: str
    status: AssessmentStatus
    confidence: float = Field(ge=0, le=1)
    evidence: list[Evidence]
    explanation: str
    evidence_limits: str | None = None
    suggested_rewrite: str | None = None


class AssessmentMeta(InputModel):
    model: str
    tokens: int = Field(ge=0)
    pages: int = Field(ge=0)


class AssessmentResult(InputModel):
    facts: list[Fact]
    claims: list[AssessedClaim]
    meta: AssessmentMeta

    @model_validator(mode="after")
    def validate_references(self):
        fact_by_id = {fact.id: fact for fact in self.facts}
        if len(fact_by_id) != len(self.facts):
            raise ValueError("Fact IDs must be unique within an assessment.")
        claim_ids = [claim.id for claim in self.claims]
        if len(set(claim_ids)) != len(claim_ids):
            raise ValueError("Claim IDs must be unique within an assessment.")
        for fact in self.facts:
            if fact.page > self.meta.pages:
                raise ValueError("Fact page exceeds meta.pages.")
        for claim in self.claims:
            if claim.status in {AssessmentStatus.supported, AssessmentStatus.partially_supported} and not claim.evidence:
                raise ValueError("Supported claims require at least one evidence reference.")
            for evidence in claim.evidence:
                fact = fact_by_id.get(evidence.fact_id)
                if fact is None or evidence.page != fact.page or evidence.page > self.meta.pages:
                    raise ValueError("Evidence must reference a fact on the same valid page.")
        return self
