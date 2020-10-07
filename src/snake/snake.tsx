import React, { useCallback, useEffect, useRef, KeyboardEvent } from "react"
import { animationFrameScheduler, BehaviorSubject, fromEvent, interval, Subject } from "rxjs"
import { map, scan, tap, withLatestFrom } from "rxjs/operators"
const WALL_HEIGHT = 10
const SNAKE_WIDTH = 10
const DOT_WIDTH = SNAKE_WIDTH
const PERIOD = 200
interface IPosition {
  x: number,
  y: number
}

interface ISnake {
  body: IPosition[]
}
type IDir = 'up' | 'down' | 'left' | 'right'

const KEY_MAP: any = {
  'ArrowRight': 'right',
  'ArrowLeft': 'left',
  'ArrowDown': 'down',
  'ArrowUp': 'up'
}
function deepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

function posEqual(a: IPosition, b: IPosition) {
  return a.x === b.x && a.y === b.y
}
const dirs = Object.values(KEY_MAP) as IDir[]
const Snake: React.FC<{}> = () => {
  const stageRef = useRef<any>(null)
  useEffect(() => {
    const stage = stageRef.current
    const context = stage.getContext('2d') as CanvasRenderingContext2D
    const initSnake = { body: [{ x: 230, y: 130 }, { x: 230, y: 140 }] }
    drawWall(context, stage)
    drawSnack(context, initSnake)
    const subject = new Subject<IDir>()
    const foodSubject = new BehaviorSubject<IPosition | null>(createFood(initSnake, stage))
    fromEvent(document, "keydown").pipe(
      map(v => KEY_MAP[(v as unknown as KeyboardEvent).key])
    ).subscribe(subject)

    const tick$ = interval(PERIOD, animationFrameScheduler).pipe(
      withLatestFrom(subject, foodSubject, (_, keyDir, food) => { return { keyDir, food } }),
      scan((acc, val) => {
        const dir = judgeDir(snakeChangeDir(acc.snake, val.keyDir))
        const snake = snakeMove(acc.snake, dir)
        const food = val.food

        if (food === null) {
          throw Error("win the game")
        }
        if (isAteFood(snake, food)) {
          foodSubject.next(createFood(snake, stage))
          snake.body.unshift(food)
          console.table(snake.body)
        }
        return { snake, food }
      }, { snake: initSnake, food: { x: 0, y: 0 } as IPosition | null }),
      tap(({ snake, food }) => {
        clearDrawable(context, stage)
        drawSnack(context, snake)
        if (isDead(snake, stage)) {
          throw Error("lose the game")
        }
        drawDot(context, food!!)
      })
    )

    tick$
      .subscribe(v => {
        console.log('initSnake', initSnake)
        console.log(v)
      }, e => {
        drawText(context, e.message, { x: stage.width / 2, y: stage.height / 2 })
      })
  }, [])


  const isAteFood = useCallback((snake: ISnake, food: IPosition) => {
    const head = snake.body[0]
    return posEqual(head, food)
  }, [])

  const createFood = useCallback((snake: ISnake, stage) => {
    const startX = WALL_HEIGHT
    const startY = WALL_HEIGHT
    const endX = stage.width - WALL_HEIGHT - DOT_WIDTH
    const endY = stage.height - WALL_HEIGHT - DOT_WIDTH
    const arr: IPosition[] = []
    for (let x = startX; x < endX; x += DOT_WIDTH) {
      for (let y = startY; y < endY; y += DOT_WIDTH) {
        if (!snake.body.every(v => posEqual(v, { x, y }))) {
          arr.push({ x, y })
        }
      }
    }
    if (arr.length === 0) {
      return null
    }
    const index = Math.floor(Math.random() * arr.length)
    return arr[index]
  }, [])

  const judgeDir = useCallback((snake: ISnake) => {
    const body = snake.body
    if (isVertical(snake)) {
      return body[0].y > body[1].y ? 'down' : 'up'
    } else {
      return body[0].x > body[1].x ? 'right' : 'left'
    }
  }, [])

  const drawWall = useCallback((context: CanvasRenderingContext2D, stage) => {
    context.beginPath()
    context.fillStyle = 'red'
    context.rect(0, 0, stage.width, stage.height)
    context.fill()
    context.closePath()
    clearDrawable(context, stage)
  }, [])

  const clearDrawable = useCallback((context: CanvasRenderingContext2D, stage) => {
    context.clearRect(0 + WALL_HEIGHT, 0 + WALL_HEIGHT, stage.width - 2 * WALL_HEIGHT, stage.height - 2 * WALL_HEIGHT)
  }, [])

  const isDead = useCallback((snake: ISnake, stage) => {
    const head = snake.body[0]
    const isTouchSelf = snake.body.slice(2).some(v => posEqual(head, v))
    const isTouchWall = head.x < WALL_HEIGHT
      || head.x > stage.width - WALL_HEIGHT - SNAKE_WIDTH
      || head.y < WALL_HEIGHT
      || head.y > stage.height - WALL_HEIGHT - SNAKE_WIDTH
    return isTouchSelf || isTouchWall
  }, [])



  const drawText = useCallback((context: CanvasRenderingContext2D, text: string, pos: IPosition = { x: 100, y: 100 }) => {
    context.textAlign = 'center'
    context.font = '24px Courier New';
    context.fillStyle = 'green'
    context.fillText(text, pos.x, pos.y);
  }, [])

  const isVertical = useCallback((snake: ISnake) => {
    const body = snake.body
    return body[0].x === body[1].x
  }, [])
  const isHorizontal = useCallback((snake: ISnake) => {
    const body = snake.body
    return body[0].y === body[1].y
  }, [])
  const snakeChangeDir = useCallback((snake: ISnake, dir: IDir) => {
    switch (dir) {
      case 'down':
        // horizontal
        if (isHorizontal(snake)) {
          return snakeMove(snake, dir)
        }
        break;
      case 'up':
        // horizontal
        if (isHorizontal(snake)) {
          return snakeMove(snake, dir)
        }
        break;
      case 'left':
        // vertical
        if (isVertical(snake)) {
          return snakeMove(snake, dir)
        }
        break;
      case 'right':
        // vertical
        if (isVertical(snake)) {
          return snakeMove(snake, dir)
        }
        break;
    }
    return { ...snake }
    // console.log(snake)
  }, [])


  const snakeMove = useCallback((snake: ISnake, dir: IDir) => {
    switch (dir) {
      case 'down':
        return snakeMoveDown(snake)
      case 'up':
        return snakeMoveUp(snake)
      case 'left':
        return snakeMoveLeft(snake)
      case 'right':
        return snakeMoveRight(snake)
    }
  }, [])

  const snakeMoveDown = useCallback((snake: ISnake) => {
    const newSnake = deepCopy(snake)
    const body = newSnake.body
    body.unshift({ x: body[0].x, y: body[0].y + SNAKE_WIDTH })
    body.pop()
    return newSnake
  }, [])
  const snakeMoveUp = useCallback((snake: ISnake) => {
    const newSnake = deepCopy(snake)
    const body = newSnake.body
    body.unshift({ x: body[0].x, y: body[0].y - SNAKE_WIDTH })
    body.pop()
    return newSnake
  }, [])
  const snakeMoveLeft = useCallback((snake: ISnake) => {
    const newSnake = deepCopy(snake)
    const body = newSnake.body
    body.unshift({ x: body[0].x - SNAKE_WIDTH, y: body[0].y })
    body.pop()
    return newSnake
  }, [])
  const snakeMoveRight = useCallback((snake: ISnake) => {
    const newSnake = deepCopy(snake)
    const body = newSnake.body
    body.unshift({ x: body[0].x + SNAKE_WIDTH, y: body[0].y })
    body.pop()
    return newSnake
  }, [])

  const drawSnack = useCallback((context: CanvasRenderingContext2D, snake: ISnake) => {
    drawDot(context, snake.body[0], '#f48126')
    snake.body.slice(1).forEach((pos) => drawDot(context, pos, 'skyblue'))
  }, [])

  const drawDot = useCallback((context: CanvasRenderingContext2D, pos: IPosition, color: string = '#40da4c') => {
    context.beginPath()
    context.fillStyle = color
    context.rect(pos.x, pos.y, DOT_WIDTH, DOT_WIDTH)
    context.fill()
    context.closePath()
  }, [])




  return <div>
    <canvas ref={stageRef} width="480" height="320"></canvas>
  </div>
}
export default Snake