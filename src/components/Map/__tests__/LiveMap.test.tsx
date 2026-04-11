import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock call filtering logic
function filterCallsBySource(calls: any[], source: string) {
    return calls.filter(call => call.source === source);
}

describe('LiveMap Call Filtering', () => {
    describe('filterCallsBySource', () => {
        it('should filter calls by cad_sync source', () => {
            const calls = [
                { id: 1, source: 'cad_sync', location: 'Test 1' },
                { id: 2, source: 'web', location: 'Test 2' },
                { id: 3, source: 'cad_sync', location: 'Test 3' },
                { id: 4, source: 'web', location: 'Test 4' },
            ];

            const filtered = filterCallsBySource(calls, 'cad_sync');
            
            expect(filtered).toHaveLength(2);
            expect(filtered.every(call => call.source === 'cad_sync')).toBe(true);
            expect(filtered.map(c => c.id)).toEqual([1, 3]);
        });

        it('should return empty array when no calls match source', () => {
            const calls = [
                { id: 1, source: 'web', location: 'Test 1' },
                { id: 2, source: 'web', location: 'Test 2' },
            ];

            const filtered = filterCallsBySource(calls, 'cad_sync');
            
            expect(filtered).toHaveLength(0);
        });

        it('should handle empty calls array', () => {
            const filtered = filterCallsBySource([], 'cad_sync');
            expect(filtered).toHaveLength(0);
        });

        it('should handle calls with undefined source', () => {
            const calls = [
                { id: 1, source: 'cad_sync', location: 'Test 1' },
                { id: 2, source: undefined, location: 'Test 2' },
                { id: 3, source: null, location: 'Test 3' },
            ];

            const filtered = filterCallsBySource(calls, 'cad_sync');
            
            expect(filtered).toHaveLength(1);
            expect(filtered[0].id).toBe(1);
        });
    });

    describe('Call source tracking', () => {
        it('should distinguish between cad_sync and web sources', () => {
            const cadSyncCall = { id: 1, source: 'cad_sync' };
            const webCall = { id: 2, source: 'web' };

            expect(cadSyncCall.source).toBe('cad_sync');
            expect(webCall.source).toBe('web');
            expect(cadSyncCall.source).not.toBe(webCall.source);
        });
    });
});
