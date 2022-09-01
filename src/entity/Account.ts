
export default class Account {
    
    public constructor(
        public readonly email: string,
        public readonly domains: string[],
        public readonly emails: string[],
        public readonly premium_level: 0 | 1 | 2,
    ) {}
    
}
