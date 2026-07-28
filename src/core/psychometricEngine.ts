/**
 * Item Response Theory (IRT) and Computerized Adaptive Testing (CAT) Engine
 * for dynamic theta (complexity) score computation.
 */
export class PsychometricEngine {
    private theta: number = 0; // User's estimated ability or prompt complexity baseline

    /**
     * Update theta using a simplified Item Response Theory (IRT) model based on success.
     * @param difficulty The difficulty of the prompt/task (b parameter)
     * @param success 1 for success, 0 for failure
     */
    updateTheta(difficulty: number, success: number): number {
        // Simplified Rasch model update
        // P(success) = 1 / (1 + exp(-(theta - difficulty)))
        const pSuccess = 1 / (1 + Math.exp(-(this.theta - difficulty)));
        // Adjust theta based on prediction error
        const learningRate = 0.5;
        this.theta = this.theta + learningRate * (success - pSuccess);
        return this.theta;
    }

    getTheta(): number {
        return this.theta;
    }

    /**
     * Compute a prompt complexity score.
     */
    evaluatePromptComplexity(prompt: string): number {
        const length = prompt.length;
        // Basic heuristic: longer prompts are slightly more complex, plus dynamic theta baseline
        let score = (length / 100) + this.theta;
        // Cap complexity to reasonable bounds
        return Math.max(0, Math.min(10, score));
    }
}
