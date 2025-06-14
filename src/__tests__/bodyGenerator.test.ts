// @ts-nocheck
import { generateBasicBody } from '../utils/bodyGenerator';

describe('generateBasicBody', () => {
    it('generates <= budget', () => {
        const body = generateBasicBody(300);
        expect(body.length).toBe(3); // one set of 3 parts
    });
}); 