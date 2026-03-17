import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const token =
            req.cookies.get('access_token')?.value ||
            req.cookies.get('token')?.value ||
            req.headers.get('authorization')?.replace('Bearer ', '');

        if (token) {
            return NextResponse.json({ token });
        }

        return NextResponse.json({ token: null }, { status: 401 });
    } catch (e) {
        return NextResponse.json(
            { error: 'Failed to retrieve token' },
            { status: 500 }
        );
    }
}