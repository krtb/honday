import './styles/index.scss'

const age: number = 99;
console.log(age);

const obj = {
    one: {
        two: {
            three: 'awooooo',
        }
    }
}

function woof(noise: any) {
    console.log(noise?.one?.two?.three)
}

woof(0)