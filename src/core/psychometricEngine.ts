/**
 * Item Response Theory (IRT), Computerized Adaptive Testing (CAT), and
 * Live Adaptive Learning & Psychometric API Client.
 */
export interface PsychometricEvaluationResult {
    prompt: string;
    promptLength: number;
    complexityScore: number;
    previousTheta: number;
    updatedTheta: number;
    discriminationParam: number;
    difficultyParam: number;
    successProbability: number;
    standardError: number;
    apiKeyConfigured: boolean;
    remoteApiResponse?: unknown;
}

export class PsychometricEngine {
    private theta: number = 0; // User/Prompt trait ability baseline
    private apiKey: string;
    private apiEndpoint: string;

    constructor(apiKey?: string, apiEndpoint?: string) {
        this.apiKey = apiKey || process.env.PSYCHOMETRIC_API_KEY || process.env.ALE_API_KEY || "ale_live_EFHs4BuU8wPyejRBi3VYZ1lSLnaaTJKlJv6HZiwem0o";
        this.apiEndpoint = apiEndpoint || process.env.PSYCHOMETRIC_API_ENDPOINT || "https://api.psychometrics.ai/v1/evaluate";
    }

    /**
     * 2-Parameter Logistic (2PL) Item Response Theory (IRT) probability calculation.
     * P(theta) = 1 / (1 + exp(-a * (theta - b)))
     */
    compute2PLProbability(theta: number, bDifficulty: number, aDiscrimination: number = 1.2): number {
        return 1 / (1 + Math.exp(-aDiscrimination * (theta - bDifficulty)));
    }

    /**
     * Compute Fisher Information for Computerized Adaptive Testing (CAT) item selection.
     * I(theta) = a^2 * P(theta) * (1 - P(theta))
     */
    computeFisherInformation(theta: number, bDifficulty: number, aDiscrimination: number = 1.2): number {
        const p = this.compute2PLProbability(theta, bDifficulty, aDiscrimination);
        return aDiscrimination * aDiscrimination * p * (1 - p);
    }

    /**
     * Update theta using 2PL IRT model and compute standard error of estimation.
     * @param difficulty The difficulty parameter of the item (b)
     * @param success 1 for success, 0 for failure
     * @param aDiscrimination The discrimination parameter of the item (a)
     */
    updateTheta(difficulty: number, success: number, aDiscrimination: number = 1.2): number {
        const pSuccess = this.compute2PLProbability(this.theta, difficulty, aDiscrimination);
        const learningRate = 0.5;

        // Gradient update step
        this.theta = this.theta + learningRate * aDiscrimination * (success - pSuccess);
        return this.theta;
    }

    getTheta(): number {
        return this.theta;
    }

    /**
     * Compute prompt complexity score bounded in [0, 10].
     */
    evaluatePromptComplexity(prompt: string): number {
        const length = prompt.length;
        const lengthFactor = length / 100;
        const rawScore = lengthFactor + this.theta;
        return Math.max(0, Math.min(10, rawScore));
    }

    /**
     * Evaluates psychometric profile via Live API call with offline IRT fallback.
     */
    async evaluatePsychometricProfile(
        prompt: string,
        difficulty: number = 1.0,
        success: number = 1,
        aDiscrimination: number = 1.2
    ): Promise<PsychometricEvaluationResult> {
        const previousTheta = this.theta;
        const pSuccess = this.compute2PLProbability(this.theta, difficulty, aDiscrimination);
        const updatedTheta = this.updateTheta(difficulty, success, aDiscrimination);
        const fisherInfo = this.computeFisherInformation(updatedTheta, difficulty, aDiscrimination);
        const standardError = 1 / Math.sqrt(Math.max(0.0001, fisherInfo));

        const complexityScore = this.evaluatePromptComplexity(prompt);

        let remoteApiResponse: unknown = undefined;

        // Attempt Live Remote API Call if key is active
        if (this.apiKey) {
            try {
                const response = await fetch(this.apiEndpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${this.apiKey}`,
                        "X-API-Key": this.apiKey
                    },
                    body: JSON.stringify({
                        prompt,
                        difficulty,
                        userTheta: updatedTheta,
                        discrimination: aDiscrimination
                    })
                });

                if (response.ok) {
                    remoteApiResponse = await response.json();
                } else {
                    remoteApiResponse = {
                        status: response.status,
                        statusText: response.statusText,
                        fallback: "Offline IRT engine evaluated locally."
                    };
                }
            } catch (err) {
                remoteApiResponse = {
                    error: err instanceof Error ? err.message : String(err),
                    fallback: "Offline IRT engine evaluated locally."
                };
            }
        }

        return {
            prompt,
            promptLength: prompt.length,
            complexityScore,
            previousTheta,
            updatedTheta,
            discriminationParam: aDiscrimination,
            difficultyParam: difficulty,
            successProbability: Number(pSuccess.toFixed(4)),
            standardError: Number(standardError.toFixed(4)),
            apiKeyConfigured: !!this.apiKey,
            remoteApiResponse
        };
    }
}

export const psychometricEngine = new PsychometricEngine();
