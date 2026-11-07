from collections.abc import Generator

from fastapi import Depends, Header, HTTPException
from supabase import Client, create_client

from app.config import Settings, get_settings


def get_supabase(settings: Settings = Depends(get_settings)) -> Client:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(status_code=503, detail="Supabase is not configured.")
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def get_user_id(
    authorization: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> str:
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise HTTPException(status_code=503, detail="Supabase authentication is not configured.")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="A Supabase access token is required.")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        response = create_client(settings.supabase_url, settings.supabase_anon_key).auth.get_user(token)
        if response.user is None:
            raise ValueError("No authenticated user")
        return str(response.user.id)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="The access token is invalid or expired.") from exc


def company_for_user(client: Client, user_id: str) -> dict:
    rows = client.table("companies").select("id,name").eq("owner_user_id", user_id).limit(1).execute().data
    if not rows:
        raise HTTPException(status_code=404, detail="Create a company before managing products.")
    return rows[0]


def owned_product(client: Client, user_id: str, product_id: str) -> tuple[dict, dict]:
    company = company_for_user(client, user_id)
    rows = (
        client.table("products").select("*").eq("id", product_id)
        .eq("company_id", company["id"]).limit(1).execute().data
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Product not found.")
    return company, rows[0]
