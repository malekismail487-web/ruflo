export class NemotronClient {
    private apiKey: string;
    private baseUrl: string = "https://integrate.api.nvidia.com/v1";
    private model: string;

    constructor(apiKey?: string, model: string = "nvidia/nemotron-3-ultra") {
        this.apiKey = apiKey || process.env.NVIDIA_API_KEY || "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";
        this.model = model;
        if (!this.apiKey) {
            throw new Error("NVIDIA API Key is required for NemotronClient");
        }
    }

    async generate(prompt: string, maxTokens: number = 1024): Promise<string> {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${this.apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: this.model,
                messages: [{ role: "user", content: prompt }],
                max_tokens: maxTokens,
                temperature: 0.7,
                top_p: 1
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Nemotron API error (${response.status}): ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }
}

