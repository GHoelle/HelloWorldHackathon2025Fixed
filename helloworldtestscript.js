let recursionDepth = 0;
    const MAX_RECURSION_DEPTH = 10;

    function differentiate() {
      const input = document.getElementById('inputExpr1').value;
      const output = document.getElementById('output1');
      output.innerHTML = 'Processing...';
      const steps = [];
      const variable = 'x';

      try {
        const node = math.parse(input);

        function toTex(expr) {
          return math.parse(expr.toString()).toTex();
        }

        function derive(node) {
          if (node.type === 'OperatorNode') {
            const op = node.op;
            const args = node.args;

            if (op === '+') {
              steps.push(`\\( \\frac{d}{dx}[f + g] = \\frac{d}{dx}[f] + \\frac{d}{dx}[g] \\)`);
              return new math.OperatorNode('+', 'add', args.map(derive));
            }

            if (op === '-') {
              steps.push(`\\( \\frac{d}{dx}[f - g] = \\frac{d}{dx}[f] - \\frac{d}{dx}[g] \\)`);
              return new math.OperatorNode('-', 'subtract', args.map(derive));
            }

            if (op === '*') {
              const f = args[0];
              const g = args[1];
              const fTex = toTex(f);
              const gTex = toTex(g);
              steps.push(`\\( \\frac{d}{dx}[${fTex} \\cdot ${gTex}] = \\frac{d}{dx}[${fTex}] \\cdot ${gTex} + ${fTex} \\cdot \\frac{d}{dx}[${gTex}] \\)`);
              const fPrime = derive(f);
              const gPrime = derive(g);
              return new math.OperatorNode('+', 'add', [
                new math.OperatorNode('*', 'multiply', [fPrime, g]),
                new math.OperatorNode('*', 'multiply', [f, gPrime])
              ]);
            }

            if (op === '/') {
              const f = args[0];
              const g = args[1];
              const fTex = toTex(f);
              const gTex = toTex(g);
              steps.push(`\\( \\frac{d}{dx}\\left[\\frac{${fTex}}{${gTex}}\\right] = \\frac{\\frac{d}{dx}[${fTex}] \\cdot ${gTex} - ${fTex} \\cdot \\frac{d}{dx}[${gTex}]}{(${gTex})^2} \\)`);
              const fPrime = derive(f);
              const gPrime = derive(g);
              const numerator = new math.OperatorNode('-', 'subtract', [
                new math.OperatorNode('*', 'multiply', [fPrime, g]),
                new math.OperatorNode('*', 'multiply', [f, gPrime])
              ]);
              const denominator = new math.OperatorNode('^', 'pow', [g, math.parse('2')]);
              return new math.OperatorNode('/', 'divide', [numerator, denominator]);
            }

            if (op === '^') {
              const base = args[0];
              const exponent = args[1];
              if (base.name === variable && exponent.type === 'ConstantNode') {
                const n = parseFloat(exponent.value);
                steps.push(`\\( \\frac{d}{dx}[x^n] = n \\cdot x^{n - 1} \\)`);
                return new math.OperatorNode('*', 'multiply', [
                  math.parse(n.toString()),
                  new math.OperatorNode('^', 'pow', [base, math.parse((n - 1).toString())])
                ]);
              } else {
                steps.push(`\\( \\frac{d}{dx}[u^n] = n \\cdot u^{n-1} \\cdot \\frac{du}{dx} \\)`);
                const uPrime = derive(base);
                const newExponent = new math.OperatorNode('-', 'subtract', [exponent, math.parse('1')]);
                const uPow = new math.OperatorNode('^', 'pow', [base, newExponent]);
                const outer = new math.OperatorNode('*', 'multiply', [exponent, uPow]);
                return new math.OperatorNode('*', 'multiply', [outer, uPrime]);
              }
            }
          }

          if (node.type === 'FunctionNode') {
            const fnName = node.fn.name;
            const arg = node.args[0];
            const argTex = toTex(arg);
            let outerDerivative;
            switch (fnName) {
              case 'sin':
                outerDerivative = new math.FunctionNode('cos', [arg]);
                steps.push(`\\( \\frac{d}{dx}[\\sin(${argTex})] = \\cos(${argTex}) \\cdot \\frac{d}{dx}[${argTex}] \\)`);
                break;
              case 'cos':
                outerDerivative = new math.OperatorNode('*', 'multiply', [
                  math.parse('-1'),
                  new math.FunctionNode('sin', [arg])
                ]);
                steps.push(`\\( \\frac{d}{dx}[\\cos(${argTex})] = -\\sin(${argTex}) \\cdot \\frac{d}{dx}[${argTex}] \\)`);
                break;
              case 'tan':
                outerDerivative = new math.OperatorNode('^', 'pow', [
                  new math.FunctionNode('sec', [arg]),
                  math.parse('2')
                ]);
                steps.push(`\\( \\frac{d}{dx}[\\tan(${argTex})] = \\sec^2(${argTex}) \\cdot \\frac{d}{dx}[${argTex}] \\)`);
                break;
              case 'ln':
                outerDerivative = new math.OperatorNode('/', 'divide', [math.parse('1'), arg]);
                steps.push(`\\( \\frac{d}{dx}[\\ln(${argTex})] = \\frac{1}{${argTex}} \\cdot \\frac{d}{dx}[${argTex}] \\)`);
                break;
              case 'exp':
                outerDerivative = new math.FunctionNode('exp', [arg]);
                steps.push(`\\( \\frac{d}{dx}[\\exp(${argTex})] = \\exp(${argTex}) \\cdot \\frac{d}{dx}[${argTex}] \\)`);
                break;
              case 'sqrt':
                outerDerivative = new math.OperatorNode('/', 'divide', [
                  math.parse('1'),
                  new math.OperatorNode('*', 'multiply', [
                    math.parse('2'),
                    new math.FunctionNode('sqrt', [arg])
                  ])
                ]);
                steps.push(`\\( \\frac{d}{dx}[\\sqrt{${argTex}}] = \\frac{1}{2\\sqrt{${argTex}}} \\cdot \\frac{d}{dx}[${argTex}] \\)`);
                break;
              default:
                throw `Unsupported function: ${fnName}`;
            }
            return new math.OperatorNode('*', 'multiply', [outerDerivative, derive(arg)]);
          }

          if (node.type === 'SymbolNode') {
            return node.name === variable ? math.parse('1') : math.parse('0');
          }

          if (node.type === 'ConstantNode') {
            return math.parse('0');
          }

          throw `Unhandled node type: ${node.type}`;
        }

        const derivativeNode = derive(node);
        const simplified = math.simplify(derivativeNode);
        const allSteps = steps.map(s => `<div class="step">${s}</div>`).join('');
        const finalStep = `\\( \\text{Final Derivative: } ${simplified.toTex()} \\)`;

        output.innerHTML = allSteps + '<hr>' + finalStep;
        MathJax.typeset();
      } catch (err) {
        output.innerHTML = `<b>Error:</b> ${err}`;
      }
    }

    function integrateExpr() {
      recursionDepth = 0; 
      const input = document.getElementById('inputExpr2').value;
      const output = document.getElementById('output2');
      output.innerHTML = 'Processing...';
      const steps = [];
      const variable = 'x';

      function nodeToTex(n) {
        try {
          if (!n) return '';
          if (typeof n.toTex === 'function') return n.toTex();
          return math.parse(n.toString()).toTex();
        } catch (e) {
          return math.parse(n.toString()).toTex();
        }
      }

      function isVar(n) { return n && n.type === 'SymbolNode' && n.name === variable; }
      function isConst(n) { return n && n.type === 'ConstantNode'; }
      function isPowerOfX(n) {
        return n && n.type === 'OperatorNode' && n.op === '^'
               && n.args[0].type === 'SymbolNode' && n.args[0].name === variable
               && n.args[1].type === 'ConstantNode';
      }
      function getPowerExp(n) { return parseFloat(n.args[1].value); }

      function flattenMultiply(n) {
        if (n.type === 'OperatorNode' && n.op === '*') {
          const out = [];
          for (const a of n.args) {
            if (a.type === 'OperatorNode' && a.op === '*') out.push(...flattenMultiply(a));
            else out.push(a);
          }
          return out;
        }
        return [n];
      }
      
      function multiplyNodes(arr) {
        if (!arr || arr.length === 0) return math.parse('1');
        if (arr.length === 1) return arr[0];
        return new math.OperatorNode('*', 'multiply', arr);
      }

      function nodesEqual(a, b) {
        try {
          const diff = math.simplify(new math.OperatorNode('-', 'subtract', [a, b]));
          return diff.toString() === '0';
        } catch (e) {
          return false;
        }
      }

      function isLinearInX(node) {
        try {
          const derivative = math.derivative(node, variable);
          const simplified = math.simplify(derivative);
          return simplified.type === 'ConstantNode';
        } catch (e) {
          return false;
        }
      }

      function integrateNode(node) {
        recursionDepth++;
        if (recursionDepth > MAX_RECURSION_DEPTH) {
          throw "Integration is too complex or may not converge";
        }
        
        try {
          const simplified = math.simplify(node);
          if (simplified.toString() !== node.toString()) {
            steps.push(`Simplifying: \\( ${nodeToTex(node)} = ${nodeToTex(simplified)} \\)`);
            return integrateNode(simplified);
          }
        } catch (e) {}
        
        if (node.type === 'OperatorNode' && (node.op === '+' || node.op === '-')) {
          const op = node.op;
          const args = node.args;
          if (op === '+') steps.push(`\\( \\int (f+g)\\,dx = \\int f\\,dx + \\int g\\,dx \\)`);
          else steps.push(`\\( \\int (f-g)\\,dx = \\int f\\,dx - \\int g\\,dx \\)`);
          return new math.OperatorNode(op, op === '+' ? 'add' : 'subtract', args.map(integrateNode));
        }

        if (node.type === 'OperatorNode' && node.op === '^' && isPowerOfX(node)) {
          const n = getPowerExp(node);
          if (Math.abs(n + 1) < 1e-12) {
            steps.push(`\\( \\int x^{-1} dx = \\ln|x| + C \\)`);
            return math.parse(`ln(abs(${variable}))`);
          } else {
            steps.push(`\\( \\int x^{${n}} dx = \\frac{x^{${n+1}}}{${n+1}} + C \\)`);
            return math.parse(`(x^${n+1})/(${n+1})`);
          }
        }

        if (node.type === 'OperatorNode' && node.op === '/') {
          const num = node.args[0];
          const den = node.args[1];
          
          try {
            const denDeriv = math.derivative(den, variable);
            if (nodesEqual(math.simplify(num), math.simplify(denDeriv))) {
              steps.push(`Detected form \\(\\int \\frac{u'}{u}\\,dx = \\ln|u| + C\\). Let \\(u=${nodeToTex(den)}\\).`);
              return math.parse(`ln(abs(${den.toString()}))`);
            }
          } catch (e) { }

          try {
            if (isConst(num) && parseFloat(num.value) === 1) {
              if (den.type === 'OperatorNode' && den.op === '+') {
                const terms = den.args;
                let aSquared = null;
                let hasXSquared = false;
                
                for (const term of terms) {
                  if (term.type === 'OperatorNode' && term.op === '^') {
                    if (isVar(term.args[0]) && isConst(term.args[1]) && 
                        parseFloat(term.args[1].value) === 2) {
                      hasXSquared = true;
                    }
                  } else if (isConst(term)) {
                    aSquared = term;
                  }
                }
                
                if (hasXSquared && aSquared) {
                  const a = Math.sqrt(parseFloat(aSquared.value));
                  steps.push(`\\( \\int \\frac{1}{x^2 + ${a*a}} dx = \\frac{1}{${a}} \\arctan\\left(\\frac{x}{${a}}\\right) + C \\)`);
                  return math.parse(`(1/${a}) * atan(x/${a})`);
                }
              }
            }
          } catch (e) { }
          
          try {
            if (isLinearInX(den)) {
              steps.push(`Using substitution for linear denominator: \\( u = ${nodeToTex(den)} \\)`);
              const u = den;
              const uPrime = math.derivative(u, variable);
              const du = math.simplify(uPrime);
              
              const a = du;
              const xExpr = new math.OperatorNode('/', 'divide', [
                new math.OperatorNode('-', 'subtract', [u, math.parse('b')]),
                a
              ]);
              
            }
          } catch (e) {}
          
          throw `Unsupported quotient integral: \\(\\int \\frac{${nodeToTex(num)}}{${nodeToTex(den)}} dx\\)`;
        }

        if (node.type === 'OperatorNode' && node.op === '*') {
          const factors = flattenMultiply(node);

          for (let i = 0; i < factors.length; i++) {
            const f = factors[i];
            if (f.type === 'FunctionNode') {
              const arg = f.args[0];
              if (!isVar(arg) && isLinearInX(arg)) {
                const u = arg;
                const uPrime = math.derivative(u, variable);
                const otherFactors = factors.filter((_, idx) => idx !== i);
                
                let constantFactor = math.parse('1');
                let remainingFactors = [];
                let foundMatch = false;
                
                for (const factor of otherFactors) {
                  if (nodesEqual(math.simplify(factor), math.simplify(uPrime))) {
                    foundMatch = true;
                  } else if (factor.type === 'OperatorNode' && factor.op === '*' && 
                             factor.args.some(arg => nodesEqual(math.simplify(arg), math.simplify(uPrime)))) {
                    foundMatch = true;
                  } else if (isConst(factor)) {
                    constantFactor = new math.OperatorNode('*', 'multiply', [constantFactor, factor]);
                  } else {
                    remainingFactors.push(factor);
                  }
                }
                
                if (foundMatch) {
                  steps.push(`Using substitution: \\( u = ${nodeToTex(u)} \\Rightarrow du = ${nodeToTex(uPrime)} dx \\)`);
                  
                  const newIntegrand = multiplyNodes([constantFactor, f]);
                  steps.push(`The integral becomes: \\( \\int ${nodeToTex(newIntegrand)} du \\)`);
                  
                  const integralResult = integrateNode(newIntegrand);
                  steps.push(`After integration: \\( ${nodeToTex(integralResult)} \\)`);
                  
                  steps.push(`Substituting back: \\( u = ${nodeToTex(u)} \\)`);
                  return integralResult;
                }
              }
            }
          }
          
          let polyIdx = -1, funcIdx = -1, expIdx = -1;
          for (let i = 0; i < factors.length; i++) {
            const f = factors[i];
            if (isVar(f) || isPowerOfX(f)) polyIdx = i;
            if (f.type === 'FunctionNode' && 
                (f.fn.name === 'sin' || f.fn.name === 'cos' || f.fn.name === 'exp')) funcIdx = i;
            if (f.type === 'FunctionNode' && f.fn.name === 'exp') expIdx = i;
          }

          let uIdx = -1;
          if (polyIdx !== -1 && funcIdx !== -1) uIdx = polyIdx;
          else if (expIdx !== -1 && funcIdx !== -1) uIdx = funcIdx;
          else if (polyIdx !== -1) uIdx = polyIdx;
          else if (funcIdx !== -1) uIdx = funcIdx;
          else uIdx = 0; 

          if (uIdx !== -1) {
            const u = factors[uIdx];
            const otherFactors = factors.filter((_, idx) => idx !== uIdx);
            const dv = multiplyNodes(otherFactors);

            steps.push(`Using integration by parts: \\(\\int u\\,dv = u v - \\int v\\,du\\).`);
            steps.push(`Let \\(u = ${nodeToTex(u)},\\; dv = ${nodeToTex(dv)}\\,dx\\)`);

            const v = integrateNode(dv); 
            steps.push(`Then \\(v = \\int dv = ${nodeToTex(v)}\\)`);

            const du = math.simplify(math.derivative(u, variable));
            steps.push(`And \\(du = ${nodeToTex(du)}\\,dx\\)`);

            const inner = new math.OperatorNode('*', 'multiply', [v, du]);
            steps.push(`Now compute \\(\\int v\\,du = \\int ${nodeToTex(inner)}\\,dx\\)`);
            
            const innerIntegral = integrateNode(inner);
            const uv = new math.OperatorNode('*', 'multiply', [u, v]);
            
            return new math.OperatorNode('-', 'subtract', [uv, innerIntegral]);
          }

          let constProd = math.parse('1');
          const nonConst = [];
          for (const f of factors) {
            if (isConst(f)) {
              constProd = new math.OperatorNode('*', 'multiply', [constProd, f]);
            } else {
              nonConst.push(f);
            }
          }
          
          if (!nodesEqual(constProd, math.parse('1'))) {
            steps.push(`Constant factor rule: \\(\\int c\\cdot f(x)\\,dx = c \\int f(x)\\,dx\\)`);
            const inner = multiplyNodes(nonConst);
            const innerIntegral = integrateNode(inner);
            return new math.OperatorNode('*', 'multiply', [constProd, innerIntegral]);
          }

          throw 'Product integral not supported with current methods.';
        }

        if (node.type === 'FunctionNode') {
          const fnName = node.fn.name;
          const arg = node.args[0];

          if (isVar(arg)) {
            switch (fnName) {
              case 'sin':
                steps.push(`\\( \\int \\sin(x)\\,dx = -\\cos(x) + C \\)`);
                return new math.OperatorNode('*', 'multiply', [math.parse('-1'), new math.FunctionNode('cos', [arg])]);
              case 'cos':
                steps.push(`\\( \\int \\cos(x)\\,dx = \\sin(x) + C \\)`);
                return new math.FunctionNode('sin', [arg]);
              case 'exp':
                steps.push(`\\( \\int e^{x}\\,dx = e^{x} + C \\)`);
                return new math.FunctionNode('exp', [arg]);
              case 'ln':
                steps.push(`\\( \\int \\ln(x)\\,dx = x\\ln(x) - x + C \\)`);
                return new math.OperatorNode('-', 'subtract', [
                  new math.OperatorNode('*', 'multiply', [math.parse('x'), new math.FunctionNode('ln', [math.parse('x')])]),
                  math.parse('x')
                ]);
              default:
                throw `Unsupported function: ${fnName}`;
            }
          }
          
          if (isLinearInX(arg)) {
            try {
              const u = arg;
              const uPrime = math.derivative(u, variable);
              const a = math.simplify(uPrime);
              
              switch (fnName) {
                case 'sin':
                  steps.push(`Using substitution for \\(\\sin(${nodeToTex(u)})\\): \\( u = ${nodeToTex(u)} \\Rightarrow du = ${nodeToTex(uPrime)} dx \\)`);
                  steps.push(`\\( \\int \\sin(u) \\frac{du}{${nodeToTex(a)}} = -\\frac{1}{${nodeToTex(a)}} \\cos(u) + C \\)`);
                  return new math.OperatorNode('/', 'divide', [
                    new math.OperatorNode('*', 'multiply', [math.parse('-1'), new math.FunctionNode('cos', [u])]),
                    a
                  ]);
                case 'cos':
                  steps.push(`Using substitution for \\(\\cos(${nodeToTex(u)})\\): \\( u = ${nodeToTex(u)} \\Rightarrow du = ${nodeToTex(uPrime)} dx \\)`);
                  steps.push(`\\( \\int \\cos(u) \\frac{du}{${nodeToTex(a)}} = \\frac{1}{${nodeToTex(a)}} \\sin(u) + C \\)`);
                  return new math.OperatorNode('/', 'divide', [
                    new math.FunctionNode('sin', [u]),
                    a
                  ]);
                case 'exp':
                  steps.push(`Using substitution for \\(e^{${nodeToTex(u)}}\\): \\( u = ${nodeToTex(u)} \\Rightarrow du = ${nodeToTex(uPrime)} dx \\)`);
                  steps.push(`\\( \\int e^{u} \\frac{du}{${nodeToTex(a)}} = \\frac{1}{${nodeToTex(a)}} e^{u} + C \\)`);
                  return new math.OperatorNode('/', 'divide', [
                    new math.FunctionNode('exp', [u]),
                    a
                  ]);
                default:
                  throw `Unsupported function with linear argument: ${fnName}`;
              }
            } catch (e) {
              throw `Error handling function with linear argument: ${e}`;
            }
          }
          
          throw `Unsupported function with non-linear argument: ${fnName}(${nodeToTex(arg)})`;
        }

        if (node.type === 'SymbolNode') {
          if (isVar(node)) {
            steps.push(`\\( \\int x\\,dx = \\frac{x^2}{2} + C \\)`);
            return math.parse('(x^2)/2');
          } else {
            steps.push(`\\( \\int ${node.name}\\,dx = ${node.name} x + C \\)`);
            return new math.OperatorNode('*', 'multiply', [node, math.parse(variable)]);
          }
        }

        if (node.type === 'ConstantNode') {
          steps.push(`\\( \\int ${node.value}\\,dx = ${node.value} x + C \\)`);
          return new math.OperatorNode('*', 'multiply', [node, math.parse(variable)]);
        }

        throw `Unhandled integration case for: ${nodeToTex(node)}`;
      }

      try {
        const parsed = math.parse(input);
        const integralNode = integrateNode(parsed);
        const simplified = math.simplify(integralNode);
        const allSteps = steps.map(s => `<div class="step">${s}</div>`).join('');
        const final = `\\( \\text{Final Integral: } ${simplified.toTex()} + C \\)`;
        output.innerHTML = allSteps + '<hr>' + final;
        MathJax.typeset();
      } catch (err) {
        output.innerHTML = `<b>Error:</b> ${err}`;
        MathJax.typeset();
      }
    }

