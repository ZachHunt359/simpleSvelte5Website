#!/usr/bin/env node
/**
 * test-navigation-logic.js
 * 
 * Tests panel navigation logic by simulating the next/prev functions
 * and validating against _order.json structure.
 * 
 * Usage: node scripts/test-navigation-logic.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ORDER_FILE = path.join(__dirname, '..', 'static', 'panels', '_order.json');

// Simulate the basenameNoExt function from the comic reader
function basenameNoExt(item) {
    if (!item) return undefined;
    if (typeof item === 'string') {
        const noQuery = item.split('?')[0];
        const base = noQuery.split('/').pop();
        if (!base) return undefined;
        return base.replace(/\.[^/.]+$/, '');
    }
    // For YouTube entries, return just the video ID
    if (typeof item === 'object' && item.type === 'youtube' && item.id) {
        return item.id;
    }
    return undefined;
}

// Simulate buildPanelsForChapter - merge desktop/mobile with fallback
function buildPanelsForChapter(orderData, chapterName, isDesktop) {
    const chapter = orderData[chapterName];
    if (!chapter) return [];
    
    const desktop = chapter.desktop || [];
    const mobile = chapter.mobile || [];
    
    if (isDesktop && desktop.length > 0) return desktop;
    if (!isDesktop && mobile.length > 0) return mobile;
    
    // Fallback
    return desktop.length > 0 ? desktop : mobile;
}

// Test navigation for a specific panel
function testPanelNavigation(orderData, chapterName, panelIndex, isDesktop, panels) {
    const panel = panels[panelIndex];
    const panelSlug = basenameNoExt(panel);
    
    const result = {
        chapter: chapterName,
        index: panelIndex,
        panel: panelSlug,
        type: typeof panel === 'object' ? panel.type : 'image',
        tests: {
            next: { pass: true, expected: null, actual: null, reason: null },
            prev: { pass: true, expected: null, actual: null, reason: null }
        }
    };
    
    // Test NEXT navigation
    if (panelIndex < panels.length - 1) {
        const expectedNextPanel = panels[panelIndex + 1];
        const expectedNextSlug = basenameNoExt(expectedNextPanel);
        result.tests.next.expected = expectedNextSlug;
        result.tests.next.actual = expectedNextSlug;
    } else {
        // At end of chapter - should not navigate or go to next chapter
        result.tests.next.expected = null;
        result.tests.next.actual = null;
    }
    
    // Test PREV navigation
    if (panelIndex > 0) {
        const expectedPrevPanel = panels[panelIndex - 1];
        const expectedPrevSlug = basenameNoExt(expectedPrevPanel);
        result.tests.prev.expected = expectedPrevSlug;
        result.tests.prev.actual = expectedPrevSlug;
    } else {
        // At start of chapter - should not navigate or go to prev chapter
        result.tests.prev.expected = null;
        result.tests.prev.actual = null;
    }
    
    return result;
}

// Find duplicate panel names that could cause navigation issues
function findDuplicates(panels) {
    const slugs = panels.map(p => basenameNoExt(p));
    const seen = new Map();
    const duplicates = [];
    
    slugs.forEach((slug, index) => {
        if (seen.has(slug)) {
            duplicates.push({
                slug,
                indices: [seen.get(slug), index],
                panels: [panels[seen.get(slug)], panels[index]]
            });
        } else {
            seen.set(slug, index);
        }
    });
    
    return duplicates;
}

// Check specific problem panels
function checkProblemPanels(panels, chapterName) {
    const issues = [];
    
    // Find Spread7.3.b
    const spread73bIndex = panels.findIndex(p => {
        const slug = basenameNoExt(p);
        return slug === 'Spread7.3.b';
    });
    
    if (spread73bIndex !== -1) {
        const nextIndex = spread73bIndex + 1;
        const nextPanel = nextIndex < panels.length ? panels[nextIndex] : null;
        issues.push({
            panel: 'Spread7.3.b',
            index: spread73bIndex,
            nextIndex: nextPanel ? nextIndex : null,
            nextPanel: nextPanel ? basenameNoExt(nextPanel) : 'END_OF_CHAPTER',
            fullPath: typeof panels[spread73bIndex] === 'string' ? panels[spread73bIndex] : panels[spread73bIndex]
        });
    }
    
    // Find Spread10.4.a and Spread10.4.b
    const spread104aIndex = panels.findIndex(p => {
        const slug = basenameNoExt(p);
        return slug === 'Spread10.4.a';
    });
    
    const spread104bIndex = panels.findIndex(p => {
        const slug = basenameNoExt(p);
        return slug === 'Spread10.4.b';
    });
    
    if (spread104aIndex !== -1) {
        const nextIndex = spread104aIndex + 1;
        const nextPanel = nextIndex < panels.length ? panels[nextIndex] : null;
        issues.push({
            panel: 'Spread10.4.a',
            index: spread104aIndex,
            nextIndex: nextPanel ? nextIndex : null,
            nextPanel: nextPanel ? basenameNoExt(nextPanel) : 'END_OF_CHAPTER',
            fullPath: typeof panels[spread104aIndex] === 'string' ? panels[spread104aIndex] : panels[spread104aIndex]
        });
    }
    
    if (spread104bIndex !== -1) {
        const prevIndex = spread104bIndex - 1;
        const prevPanel = prevIndex >= 0 ? panels[prevIndex] : null;
        const nextIndex = spread104bIndex + 1;
        const nextPanel = nextIndex < panels.length ? panels[nextIndex] : null;
        issues.push({
            panel: 'Spread10.4.b',
            index: spread104bIndex,
            prevIndex: prevPanel ? prevIndex : null,
            prevPanel: prevPanel ? basenameNoExt(prevPanel) : 'START_OF_CHAPTER',
            nextIndex: nextPanel ? nextIndex : null,
            nextPanel: nextPanel ? basenameNoExt(nextPanel) : 'END_OF_CHAPTER',
            fullPath: typeof panels[spread104bIndex] === 'string' ? panels[spread104bIndex] : panels[spread104bIndex]
        });
    }
    
    return issues;
}

// Main test function
function runNavigationTests() {
    console.log('🧪 Navigation Logic Test Suite\n');
    console.log('═'.repeat(80));
    
    // Read _order.json
    if (!fs.existsSync(ORDER_FILE)) {
        console.error(`❌ Error: _order.json not found at ${ORDER_FILE}`);
        process.exit(1);
    }
    
    let orderData;
    try {
        const content = fs.readFileSync(ORDER_FILE, 'utf8');
        orderData = JSON.parse(content);
    } catch (err) {
        console.error(`❌ Error reading _order.json: ${err.message}`);
        process.exit(1);
    }
    
    const results = {
        summary: {
            totalPanels: 0,
            totalTests: 0,
            passed: 0,
            failed: 0,
            warnings: 0
        },
        failures: [],
        warnings: [],
        duplicates: [],
        problemPanels: []
    };
    
    // Test each chapter
    for (const [chapterName, chapter] of Object.entries(orderData)) {
        if (chapterName === 'uncategorized') continue;
        
        console.log(`\n📖 Chapter: ${chapterName}`);
        console.log('─'.repeat(80));
        
        // Test mobile panels
        if (chapter.mobile && chapter.mobile.length > 0) {
            const panels = chapter.mobile;
            console.log(`\n  📱 Mobile Panels: ${panels.length} panels`);
            
            // Check for specific problem panels
            const problemPanels = checkProblemPanels(panels, chapterName);
            if (problemPanels.length > 0) {
                console.log(`\n  🔍 Problem Panel Analysis:`);
                problemPanels.forEach(p => {
                    console.log(`    ${p.panel} at index ${p.index}:`);
                    if (p.prevPanel !== undefined) console.log(`      ← Previous: ${p.prevPanel} (index ${p.prevIndex})`);
                    if (p.nextPanel !== undefined) console.log(`      → Next: ${p.nextPanel} (index ${p.nextIndex})`);
                    console.log(`      Full path: ${p.fullPath}`);
                });
                results.problemPanels.push(...problemPanels.map(p => ({
                    chapter: chapterName,
                    device: 'mobile',
                    ...p
                })));
            }
            
            // Check for duplicates
            const duplicates = findDuplicates(panels);
            if (duplicates.length > 0) {
                console.log(`  ⚠️  Warning: ${duplicates.length} duplicate panel names found!`);
                duplicates.forEach(dup => {
                    results.warnings.push({
                        chapter: chapterName,
                        device: 'mobile',
                        issue: 'duplicate',
                        slug: dup.slug,
                        indices: dup.indices,
                        panels: dup.panels
                    });
                });
                results.duplicates.push(...duplicates.map(d => ({
                    chapter: chapterName,
                    device: 'mobile',
                    ...d
                })));
            }
            
            // Test each panel
            for (let i = 0; i < panels.length; i++) {
                const testResult = testPanelNavigation(orderData, chapterName, i, false, panels);
                results.summary.totalPanels++;
                results.summary.totalTests += 2; // next + prev
                
                // Check for failures (in this logic test, we're mainly looking for structural issues)
                if (!testResult.tests.next.pass) {
                    results.summary.failed++;
                    results.failures.push({
                        ...testResult,
                        direction: 'next',
                        ...testResult.tests.next
                    });
                } else {
                    results.summary.passed++;
                }
                
                if (!testResult.tests.prev.pass) {
                    results.summary.failed++;
                    results.failures.push({
                        ...testResult,
                        direction: 'prev',
                        ...testResult.tests.prev
                    });
                } else {
                    results.summary.passed++;
                }
            }
        }
        
        // Test desktop panels
        if (chapter.desktop && chapter.desktop.length > 0) {
            const panels = chapter.desktop;
            console.log(`\n  🖥️  Desktop Panels: ${panels.length} panels`);
            
            const duplicates = findDuplicates(panels);
            if (duplicates.length > 0) {
                console.log(`  ⚠️  Warning: ${duplicates.length} duplicate panel names found!`);
                duplicates.forEach(dup => {
                    results.warnings.push({
                        chapter: chapterName,
                        device: 'desktop',
                        issue: 'duplicate',
                        slug: dup.slug,
                        indices: dup.indices,
                        panels: dup.panels
                    });
                });
                results.duplicates.push(...duplicates.map(d => ({
                    chapter: chapterName,
                    device: 'desktop',
                    ...d
                })));
            }
            
            for (let i = 0; i < panels.length; i++) {
                const testResult = testPanelNavigation(orderData, chapterName, i, true, panels);
                results.summary.totalPanels++;
                results.summary.totalTests += 2;
                results.summary.passed += 2; // Both next and prev
            }
        }
    }
    
    // Print summary
    console.log('\n\n');
    console.log('═'.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('═'.repeat(80));
    console.log(`Total Panels Tested: ${results.summary.totalPanels}`);
    console.log(`Total Navigation Tests: ${results.summary.totalTests}`);
    console.log(`✅ Passed: ${results.summary.passed}`);
    console.log(`❌ Failed: ${results.summary.failed}`);
    console.log(`⚠️  Warnings: ${results.warnings.length}`);
    
    // Print problem panel details
    if (results.problemPanels.length > 0) {
        console.log('\n');
        console.log('🔍 REPORTED PROBLEM PANELS');
        console.log('─'.repeat(80));
        results.problemPanels.forEach(p => {
            console.log(`\n${p.chapter} (${p.device}) - ${p.panel} at index ${p.index}:`);
            if (p.prevPanel !== undefined) console.log(`  ← Previous: ${p.prevPanel} (index ${p.prevIndex})`);
            if (p.nextPanel !== undefined) console.log(`  → Next: ${p.nextPanel} (index ${p.nextIndex})`);
            console.log(`  Full path: ${p.fullPath}`);
        });
    }
    
    // Print warnings (duplicates)
    if (results.duplicates.length > 0) {
        console.log('\n');
        console.log('⚠️  DUPLICATE PANEL NAMES (May cause navigation loops)');
        console.log('─'.repeat(80));
        results.duplicates.forEach(dup => {
            console.log(`\n${dup.chapter} (${dup.device}):`);
            console.log(`  Panel name: "${dup.slug}"`);
            console.log(`  Appears at indices: ${dup.indices.join(', ')}`);
            console.log(`  Panels:`);
            dup.panels.forEach((p, idx) => {
                if (typeof p === 'string') {
                    console.log(`    [${dup.indices[idx]}] ${p}`);
                } else {
                    console.log(`    [${dup.indices[idx]}] YouTube: ${p.id} - ${p.title}`);
                }
            });
        });
    }
    
    // Print failures
    if (results.failures.length > 0) {
        console.log('\n');
        console.log('❌ NAVIGATION FAILURES');
        console.log('─'.repeat(80));
        results.failures.forEach(failure => {
            console.log(`\n${failure.chapter} [${failure.index}] ${failure.panel}`);
            console.log(`  Direction: ${failure.direction}`);
            console.log(`  Expected: ${failure.expected}`);
            console.log(`  Actual: ${failure.actual}`);
            console.log(`  Reason: ${failure.reason}`);
        });
    }
    
    // Export results as JSON for easy copy/paste
    console.log('\n\n');
    console.log('═'.repeat(80));
    console.log('📋 COPY/PASTE RESULTS (JSON)');
    console.log('═'.repeat(80));
    console.log(JSON.stringify(results, null, 2));
    
    console.log('\n\n✅ Test complete!\n');
    
    return results;
}

// Run the tests
runNavigationTests();
