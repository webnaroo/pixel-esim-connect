// At most 30 seconds of cached price data, with foreground refresh for open pages.
export const priceFreshness = { staleTime: 0, refetchInterval: 30_000, refetchOnWindowFocus: true } as const;