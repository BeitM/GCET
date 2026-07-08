import { NextResponse } from "next/server";
import { feedback } from "@/lib/scenarios";
import { ScenarioId } from "@/lib/types";
export async function POST(request:Request){const body=await request.json();const id=(body.scenarioId||"shooter") as ScenarioId;return NextResponse.json(feedback[id]||feedback.shooter);}
